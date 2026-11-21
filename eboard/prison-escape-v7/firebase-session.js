'use strict';

window.PrisonFirebase = (() => {
  const ttl = 12 * 60 * 60 * 1000;
  const claimWindow = 10 * 60 * 1000;
  const code = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const path = id => 'prisonV7Rooms/' + id;
  let sdkPromise;
  let authPromise;

  function sdk() {
    if (sdkPromise) return sdkPromise;
    const base = 'https://www.gstatic.com/firebasejs/12.4.0/';
    sdkPromise = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'),
      import(base + 'firebase-database.js')]).then(([app, auth, db]) => {
      const instance = app.initializeApp(window.MOON_FIREBASE_CONFIG, 'prison-v7');
      return { ...auth, ...db, auth: auth.getAuth(instance), db: db.getDatabase(instance) };
    }).catch(error => {
      sdkPromise = null;
      throw error;
    });
    return sdkPromise;
  }

  function hostSDK() {
    if (authPromise) return authPromise;
    authPromise = sdk().then(async r => {
      await r.auth.authStateReady();
      if (!r.auth.currentUser) await r.signInAnonymously(r.auth);
      return r;
    }).catch(error => {
      authPromise = null;
      throw error;
    });
    return authPromise;
  }

  const privateView = ({ revision, state, undo }) => ({ revision, state, canUndo: Boolean(undo) });

  function pack(revision, state, undo) {
    return {
      private: { revision, payload: JSON.stringify({ state, undo }) },
      public: { claimed: true, revision, payload: JSON.stringify(window.PrisonGame.publicView(state)) },
    };
  }

  function unpack(value) {
    return { revision: value.revision, ...JSON.parse(value.payload) };
  }

  async function current(r, id) {
    const ref = r.ref(r.db, path(id) + '/private');
    const saved = (await r.get(ref)).val();
    if (saved) return unpack(saved);
    try {
      await r.update(r.ref(r.db, path(id)), pack(1, null, null));
      return { revision: 1, state: null, undo: null };
    } catch (error) {
      const concurrent = (await r.get(ref)).val();
      if (!concurrent) throw error;
      return unpack(concurrent);
    }
  }

  async function create() {
    const r = await hostSDK();
    const id = code();
    const key = code();
    await r.set(r.ref(r.db, path(id)), {
      creator: r.auth.currentUser.uid, key, createdAt: r.serverTimestamp(),
      public: { claimed: false, revision: 0, payload: 'null' },
    });
    return { id, key, claimUntil: Date.now() + claimWindow, urls: [] };
  }

  async function claim(id, key) {
    if (!/^[a-f0-9]{32}$/.test(key)) throw new Error('配對連結無效。');
    const r = await hostSDK();
    try {
      await r.set(r.ref(r.db, path(id) + '/claim'), { uid: r.auth.currentUser.uid, proof: key });
    } catch {
      try { return privateView(await current(r, id)); }
      catch { throw new Error('配對碼無效、已過期，或已有主持裝置連接。'); }
    }
    return privateView(await current(r, id));
  }

  async function load(id) {
    try { return privateView(await current(await hostSDK(), id)); }
    catch { throw new Error('未能恢復主持權限，請用原本配對的瀏覽器。'); }
  }

  function conflict(value) {
    return Object.assign(new Error('課堂已更新，請核對後再操作。'), { status: 409, result: privateView(value) });
  }

  async function act(id, revision, action) {
    const r = await hostSDK();
    const ref = r.ref(r.db, path(id));
    const saved = unpack((await r.get(r.ref(r.db, path(id) + '/private'))).val());
    if (saved.revision !== revision) throw conflict(saved);
    let state;
    let undo;
    if (action.type === 'start') {
      state = window.PrisonGame.start(action.names);
      undo = null;
    } else if (action.type === 'undo' && saved.undo) {
      state = saved.undo;
      undo = null;
    } else {
      state = window.PrisonGame.apply(saved.state, action);
      if (state === saved.state) throw new Error('現在無法執行此操作。');
      undo = saved.state;
    }
    const next = { revision: revision + 1, state, undo };
    try {
      await r.update(ref, pack(next.revision, state, undo));
    } catch {
      const latest = await current(r, id);
      if (latest.revision !== revision) throw conflict(latest);
      throw new Error('未能同步操作，請重試。');
    }
    return privateView(next);
  }

  function listen(id, { update, disconnect, close }) {
    let disposed = false;
    let connected = false;
    let latest = null;
    let shown = false;
    let unsubscribers = [];
    const deliver = () => {
      if (connected && latest) {
        shown = true;
        update(latest);
      }
    };
    sdk().then(r => {
      if (disposed) return;
      unsubscribers = [
        r.onValue(r.ref(r.db, '.info/connected'), snapshot => {
          connected = Boolean(snapshot.val());
          if (connected) deliver();
          else if (shown) disconnect(false);
        }),
        r.onValue(r.ref(r.db, path(id) + '/public'), snapshot => {
          const value = snapshot.val();
          if (!value) { close(); return; }
          latest = { claimed: value.claimed, revision: value.revision, board: JSON.parse(value.payload) };
          deliver();
        }, () => close()),
      ];
    }).catch(() => { if (!disposed) disconnect(true); });
    const lifetime = setTimeout(() => { stop(); close(); }, ttl);
    function stop() {
      disposed = true;
      clearTimeout(lifetime);
      unsubscribers.forEach(unsubscribe => unsubscribe());
    }
    return stop;
  }

  return { create, claim, load, act, listen };
})();
