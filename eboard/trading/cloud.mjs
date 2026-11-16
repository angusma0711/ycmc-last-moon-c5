const SDK='https://www.gstatic.com/firebasejs/12.4.0/';
export const configured=Boolean(globalThis.MOON_FIREBASE_CONFIG?.databaseURL);
export const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
let service;
async function connect() {
  if (!configured) return null;
  if (!service) service=Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-database.js')]).then(([app,db])=>{
    const application=app.initializeApp(globalThis.MOON_FIREBASE_CONFIG);
    return {db,application,database:db.getDatabase(application)};
  });
  return service;
}
export async function hostConnection(status) {
  const s=await connect();
  if (!s) return demoHost(status);
  const {db,application,database}=s;
  const auth=await import(SDK+'firebase-auth.js');
  const authentication=auth.getAuth(application);
  await auth.setPersistence(authentication,auth.browserLocalPersistence);
  await auth.signInAnonymously(authentication);
  db.onValue(db.ref(database,'.info/connected'),snap=>status(snap.val()?'已連線':'連線中斷／重新連線中，暫停結算',Boolean(snap.val())));
  let roomRef;
  return {
    async create(state,publicData) {
      const id=randomId();roomRef=db.ref(database,'tradingRooms/'+id);
      await db.set(roomRef,{owner:authentication.currentUser.uid,revision:1,lastOp:randomId(),privateState:JSON.stringify(state),public:publicData});return id;
    },
    watch(id,receive,error) {roomRef=db.ref(database,'tradingRooms/'+id);return db.onValue(roomRef,snap=>{if(snap.exists())receive(snap.val());else error(Error('課堂不存在。'));},error);},
    async commit(revision,state,publicData,operation=randomId()) {
      const result=await db.runTransaction(roomRef,current=>{
        if (!current||current.revision!==revision) return;
        return {owner:current.owner,revision:revision+1,lastOp:operation,privateState:JSON.stringify(state),public:publicData};
      },{applyLocally:false});
      if (!result.committed) throw Error('另一個教師分頁已更新這一輪。已同步最新資料，請重新檢查；本次沒有重複結算。');
    }
  };
}
export async function watchPublic(id,receive,status,error) {
  if (!/^[a-f0-9]{32}$/.test(id||'')) throw Error('公開連結的課堂編號不正確。');
  const s=await connect();
  if (!s) {
    status('本機示範：只可同步同一瀏覽器；跨裝置須設定 Firebase',true);
    const key='trading-demo-'+id,read=()=>{const raw=localStorage.getItem(key);if(raw)receive(JSON.parse(raw).public);};
    read();const listener=e=>{if(e.key===key)read();};addEventListener('storage',listener);return()=>removeEventListener('storage',listener);
  }
  const {db,database}=s;
  const offStatus=db.onValue(db.ref(database,'.info/connected'),snap=>status(snap.val()?'即時連線':'連線中斷／保留上次畫面',Boolean(snap.val())));
  const off=db.onValue(db.ref(database,'tradingRooms/'+id+'/public'),snap=>{if(snap.exists())receive(snap.val());else error(Error('尚未找到課堂，請檢查連結。'));},error);
  return()=>{off();offStatus();};
}
function demoHost(status) {
  status('本機示範：跨裝置同步須設定 Firebase',true);let id,callback;
  const key=()=> 'trading-demo-'+id;
  return {
    async create(state,publicData){id=randomId();localStorage.setItem(key(),JSON.stringify({revision:1,privateState:JSON.stringify(state),public:publicData}));return id;},
    watch(room,receive,error){id=room;callback=receive;const read=()=>{const raw=localStorage.getItem(key());if(raw)receive(JSON.parse(raw));else error(Error('本機找不到課堂。'));};read();const listener=e=>{if(e.key===key())read();};addEventListener('storage',listener);return()=>removeEventListener('storage',listener);},
    async commit(revision,state,publicData){const old=JSON.parse(localStorage.getItem(key()));if(old.revision!==revision)throw Error('其他分頁已更新，請重新整理。');const next={revision:revision+1,privateState:JSON.stringify(state),public:publicData};localStorage.setItem(key(),JSON.stringify(next));callback(next);}
  };
}
