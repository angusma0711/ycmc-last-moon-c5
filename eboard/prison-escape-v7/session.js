'use strict';

window.PrisonRooms = (() => {
  const roomPattern = /^[a-f0-9]{32}$/;
  const tokenKey = id => 'prison-v7-host-' + id;
  const endpoint = (id, target) => 'api/rooms/' + id + '/' + target;

  async function request(path, data, token) {
    let response;
    try {
      response = await fetch(path, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
        cache: 'no-store',
      });
    } catch {
      throw new Error('未能連接課堂伺服器。');
    }
    const result = await response.json().catch(() => null);
    if (!result) throw new Error('請用 V7 QR 伺服器開啟遊戲。');
    if (!response.ok) throw Object.assign(new Error(result.error), { result, status: response.status });
    return result;
  }

  function url(mode, id, key, origin) {
    const link = new URL(location.pathname, origin || location.origin);
    if (mode === 'board') {
      link.searchParams.set('board', '');
      link.searchParams.set('room', id);
    } else link.searchParams.set('host', id);
    if (key) link.hash = key;
    return link.href;
  }

  function savedToken(id) {
    try { return localStorage.getItem(tokenKey(id)) || ''; }
    catch { return ''; }
  }

  async function claim(id, key) {
    if (!roomPattern.test(id) || !roomPattern.test(key)) throw new Error('配對連結無效。');
    const token = savedToken(id) || [...crypto.getRandomValues(new Uint8Array(16))]
      .map(byte => byte.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(tokenKey(id), token); }
    catch { throw new Error('請允許瀏覽器儲存資料以保留主持權限。'); }
    return request(endpoint(id, 'claim'), { key, token });
  }

  function listen(id, { update, disconnect, close }) {
    const source = new EventSource(endpoint(id, 'events'));
    source.onmessage = event => update(JSON.parse(event.data));
    source.onerror = () => disconnect(source.readyState === EventSource.CLOSED);
    source.addEventListener('closed', () => {
      source.close();
      close();
    });
    return () => source.close();
  }

  return {
    roomPattern, url, listen, claim,
    create: () => request('api/rooms', {}),
    load: id => request(endpoint(id, 'host'), undefined, savedToken(id)),
    act: (id, revision, action) => request(endpoint(id, 'action'), { revision, action }, savedToken(id)),
    ...(location.hostname.endsWith('.github.io') ? { ...window.PrisonFirebase, hosted: true } : {}),
  };
})();
