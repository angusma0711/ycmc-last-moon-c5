const P=globalThis.LupinPublic,params=new URLSearchParams(location.hash.slice(1));
const $=id=>document.getElementById(id),session=$('session'),host=$('privateHost'),board=$('board');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const valid=s=>/^[a-f0-9]{32}$/.test(s||'');
const read=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const urlFor=values=>{const u=new URL(location.href);u.hash=new URLSearchParams(values).toString();return u.href;};
const title='<div class="eyebrow">LUPIN / THE GRAND CHASE</div><h1>怪盜 Lupin：世紀大追捕</h1><p class="intro">情報組 × 博物館行動組<br>交換線索、部署搜查，合作守護星辰之鑽。</p>';
let sdkPromise,r,uid='',online=false,dbConnected=false,mode=params.get('view')||'start',room='',stopPair=()=>{},publishQueue=Promise.resolve(),pending=0,lastPublic=null,activePair='',syncError='';
function connection(message,error=false){$('connection').textContent=message;$('connection').classList.toggle('error',error);}
function notice(message){const node=$('notice');if(node)node.textContent=message;else connection(message,true);}
function readableError(e){return /permission.denied/i.test(e.code||'')?'此 QR 已過期、已被其他手機使用，或這部手機沒有主持權限。請在電腦建立新課堂。':e.message||String(e);}
function showSession(html){mode='start';document.body.classList.remove('private-view');host.hidden=true;board.hidden=true;session.hidden=false;session.innerHTML=html;}
async function sdk(){
 if(sdkPromise)return sdkPromise;
 sdkPromise=(async()=>{
  if(location.protocol==='file:')throw Error('跨裝置配對請使用已部署的 HTTPS 網址；本機測試請使用 localhost。');
  const base='https://www.gstatic.com/firebasejs/12.4.0/';
  const [a,b,c]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);
  const app=a.getApps().length?a.getApp():a.initializeApp(globalThis.MOON_FIREBASE_CONFIG);
  r={...b,...c,auth:b.getAuth(app),db:c.getDatabase(app)};
  await r.signInAnonymously(r.auth);uid=r.auth.currentUser.uid;
  r.onValue(r.ref(r.db,'.info/connected'),s=>{dbConnected=!!s.val();online=dbConnected&&navigator.onLine;updateConnection();lockControls();});return r;
 })();
 try{return await sdkPromise;}catch(e){sdkPromise=null;throw e;}
}
function updateConnection(){if(mode==='control'&&syncError){connection(syncError,true);return;}connection(!online?'網絡已中斷 · 公開大屏保留最後資訊；請等待重新連線':mode==='control'?(pending?'正在同步公開資訊…':'導師手機已連線 · 公開資訊已同步'):mode==='board'?'公開大屏已連線':'正在配對課堂',!online);}
function lockControls(){
 if(mode!=='control')return;
 host.querySelectorAll('#controls button,#controls select,#resetBtn,#importBtn').forEach(b=>b.disabled=!online||!ready||!!pending||b.dataset.ruleDisabled==='true');
}
function onControllerRender(){
 // Preserve V6 rule-specific disabled buttons when applying network status.
 host.querySelectorAll('#controls button,#controls select').forEach(b=>b.dataset.ruleDisabled=String(b.disabled));lockControls();
}
function initial(){
 const prev=read('lupin-pair-ticket-v1');
 showSession(title+`<section class="panel"><h2>電腦建立課堂，導師手機掃碼</h2><p>電腦只顯示公開警戒畫面。秘密位置、移動、查詢及結算全部在導師手機操作。</p><button class="primary" id="createPair">建立課堂及 QR code</button> ${prev?'<button id="resumePair">恢復上次配對</button>':''}<p id="notice" class="status" role="status"></p><p class="mini">兩台裝置均需連網，可以使用不同 Wi-Fi。兩部導師手機可共同主持；兩間房可同時開啟公開大屏。</p></section>`);
 $('createPair').onclick=()=>createPair();if($('resumePair'))$('resumePair').onclick=()=>resumePair(prev);
}
async function createPair(){
 const b=$('createPair');b.disabled=true;notice('正在建立課堂…');
 try{await sdk();const ticket={id:random(),key:random()};await r.set(r.ref(r.db,`lupinPairings/${ticket.id}`),{owner:uid,key:ticket.key,createdAt:r.serverTimestamp()});save('lupin-pair-ticket-v1',ticket);await showPair(ticket);}
 catch(e){notice(readableError(e));b.disabled=false;}
}
async function resumePair(ticket){try{await sdk();const snap=await r.get(r.ref(r.db,`lupinPairings/${ticket.id}`));if(!snap.exists())throw Error('上次課堂已關閉，請建立新課堂。');await showPair(ticket);}catch(e){notice(readableError(e));}}
async function showPair(ticket){
 stopPair();const controlURL=urlFor({view:'control',pair:ticket.id,key:ticket.key});
 showSession(title+`<section class="panel"><h2>請導師用私人手機掃描</h2><div id="controllerQR" class="qr"></div><p>課堂 ${ticket.id.slice(0,6).toUpperCase()} · 配對入口 10 分鐘有效</p><p id="notice" class="status" role="status">等待導師手機連接；成功後自動切換公開大屏。</p><details><summary>無法掃描時</summary><a href="${esc(controlURL)}" target="_blank" rel="noopener noreferrer">在導師私人裝置開啟控制器</a></details><button id="backStart">返回開始頁</button></section>`);
 const qr=qrcode(0,'M');qr.addData(controlURL);qr.make();$('controllerQR').innerHTML=qr.createSvgTag({cellSize:5,margin:16,scalable:true});
 document.querySelector('#controllerQR svg').setAttribute('aria-label','導師手機配對 QR code');
 $('backStart').onclick=()=>{stopPair();initial();};
 const off=r.onValue(r.ref(r.db,`lupinPairings/${ticket.id}`),snap=>{
  const p=snap.val();if(!p){notice('課堂已關閉，請重新建立。');return;}
  if(p.claim?.room){stopPair();history.replaceState(null,'',urlFor({view:'board',room:p.claim.room}));startBoard(p.claim.room);}
  else if(Date.now()-p.createdAt>600000)notice('QR 已過期，請返回建立新的課堂。');
 },e=>notice(readableError(e)));
 stopPair=off;
}
async function controllerEntry(){
 const pair=params.get('pair'),key=params.get('key');
 if(!valid(pair)||!valid(key)){showSession(title+'<section class="panel"><h2>配對連結無效</h2><p>請重新掃描電腦上的 QR code。</p></section>');return;}
 showSession(title+`<section class="panel"><h2>導師手機控制器</h2><p>確認這部手機沒有投影或鏡像至學生大屏。Lupin 秘密位置和完整紀錄會在兩部已配對的導師手機同步。</p><button id="claimController" class="primary">這是私人手機，連接課堂</button><p id="notice" class="status" role="status"></p></section>`);
 $('claimController').onclick=async()=>{
  const b=$('claimController');b.disabled=true;notice('正在連接課堂…');
  try{
   await sdk();await r.update(r.ref(r.db,`lupinPairings/${pair}/claim`),{uid,key});
   const pointer=await r.get(r.ref(r.db,`lupinPairings/${pair}/claim/room`));room=pointer.val()||'';activePair=pair;
   if(room){
    const snap=await r.get(r.ref(r.db,`lupinRooms/${room}/public`));if(!snap.exists())throw Error('原課堂已關閉，請建立新的 QR。');
    const shared=await r.get(r.ref(r.db,'lupinRooms/'+room+'/revision'));
    if(!shared.exists()&&snap.val().round>0&&!read(`lupin-private-${room}`))throw Error('這部手機的秘密進度已遺失。請在電腦建立新課堂，再從控制器匯入私人備份。公開大屏不能還原 Lupin 位置。');
   }else{
    room=random();await r.set(r.ref(r.db,`lupinRooms/${room}`),{owner:uid,public:{...P.initial(),updatedAt:Date.now()}});
    await r.set(r.ref(r.db,`lupinPairings/${pair}/claim`),{uid,key,room});
   }
   roomOwner=true;await loadController();
  }catch(e){notice(readableError(e));b.disabled=false;}
 };
}
let revision=0;
let applyState;
let roomOwner=false;
let ready=false;

function applyRoom(value){
 if(!value || !value.privateState || value.revision<revision)return;
 revision=value.revision;
 applyState(JSON.parse(value.privateState));
 ready=true;
 lockControls();
}

async function commit(state){
 if(pending || !online)return;
 pending=1;
 syncError='';
 lockControls();
 updateConnection();
 const ref=r.ref(r.db,'lupinRooms/'+room);
 try{
  await r.update(ref,{
   privateState:JSON.stringify(state),
   revision:revision+1,
   public:{...P.fromPrivate(state),updatedAt:Date.now()}
  });
 }catch{
  syncError='操作未確認。請按最新進度核對後再操作。';
 }
 try{
  applyRoom((await r.get(ref)).val());
 }catch{
  ready=false;
  syncError='正在等待課堂重新連線。';
 }
 pending=0;
 lockControls();
 updateConnection();
}

function attach(initial,replace){
 applyState=replace;
 r.onValue(r.ref(r.db,'lupinRooms/'+room),snap=>{
  if(pending)return;
  const value=snap.val();
  if(!value){ready=false;lockControls();return;}
  if(value.privateState)applyRoom(value);
  else if(roomOwner)commit(initial);
 },e=>{ready=false;lockControls();connection(readableError(e),true);});
}

async function joinTutor(){
 const key=params.get('key');
 room=params.get('room');
 if(!valid(key)||!valid(room)){showSession('<h2>邀請連結無效</h2>');return;}
 showSession('<section class="panel"><h2>第二位導師</h2><button id="joinTutor">在私人手機加入主持</button><p id="notice"></p></section>');
 $('joinTutor').onclick=async()=>{
  $('joinTutor').disabled=true;
  try{
   await sdk();
   await r.set(r.ref(r.db,'lupinTeams/'+room+'/guest'),{uid,key});
   activePair=room;
   await loadController();
  }catch(e){notice(readableError(e));if($('joinTutor'))$('joinTutor').disabled=false;}
 };
}

function tutorInvite(){
 if(!roomOwner)return;
 const area=$('inviteArea');
 const button=document.createElement('button');
 button.textContent='邀請第二位導師';
 const ticket=document.createElement('div');
 area.append(button,ticket);
 const ref=r.ref(r.db,'lupinTeams/'+room);
 r.onValue(ref,snap=>{
  if(snap.val()?.guest){
   ticket.textContent='第二位導師已配對';
   button.hidden=true;
  }
 });
 button.onclick=async()=>{
  button.disabled=true;
  try{
   const key=random();
   await r.set(ref,{key,issued:r.serverTimestamp()});
   const url=urlFor({view:'tutor',room,key});
   const qr=qrcode(0,'M');qr.addData(url);qr.make();
   ticket.innerHTML=qr.createSvgTag({scalable:true});
   const link=document.createElement('a');link.href=url;link.textContent='第二位導師專用連結（10 分鐘內首次配對）';ticket.append(link);
  }catch(e){notice(readableError(e));}
  button.disabled=false;
 };
}
async function copyBoard(){try{await navigator.clipboard.writeText(urlFor({view:'board',room}));connection('已複製公開大屏連結 · 可在另一間課室開啟');}catch{const input=$('boardURL');input.focus();input.select();connection('請複製已選取的公開大屏連結');}}
async function loadController(){
 const response=await fetch('controller.html?v=qr2');if(!response.ok)throw Error('無法載入主持控制器，請稍後再試。');
 mode='control';session.hidden=true;session.replaceChildren();board.hidden=true;host.hidden=false;document.body.classList.add('private-view');
 host.innerHTML=`<details class="controller-links"><summary>課堂 ${activePair.slice(0,6).toUpperCase()} · 第二間房的大屏連結</summary><p>這個連結只顯示公開資訊，不含控制權。</p><input id="boardURL" readonly aria-label="公開大屏網址" value="${esc(urlFor({view:'board',room}))}"><a href="${esc(urlFor({view:'board',room}))}" target="_blank" rel="noopener noreferrer">預覽公開大屏</a></details>`+await response.text();
 globalThis.LUPIN_SESSION={storageKey:`lupin-private-${room}`,commit,attach,onRender:onControllerRender,copyBoard};
 host.addEventListener('click',e=>{if((!online||!ready||pending)&&e.target.closest('#controls button,#resetBtn,#importBtn')){e.preventDefault();e.stopImmediatePropagation();connection('手機已離線，請等待重新連線後再操作。',true);}},true);
 tutorInvite();
 const script=document.createElement('script');script.src='controller.js?v=qr2';await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('主持控制器載入失敗'));document.body.appendChild(script);});
 updateConnection();
}
function startBoard(id){
 if(!valid(id)){showSession(title+'<section class="panel"><h2>公開大屏連結無效</h2></section>');return;}
 mode='board';room=id;host.hidden=true;host.replaceChildren();session.hidden=true;session.replaceChildren();document.body.classList.remove('private-view');board.hidden=false;board.className='public-board';
 board.innerHTML='<div class="heading"><div><div class="eyebrow">MUSEUM SECURITY / PUBLIC STATUS</div><h1>怪盜 Lupin · 博物館警戒</h1></div><button id="fullscreen">全螢幕</button></div><div id="announcement" class="announcement" role="status">正在連接課堂…</div><section id="resources" class="resources"></section><section id="outcome" class="result" hidden></section><div id="publicMap"></div><div class="note">情報組與博物館行動組透過對講機交換線索。請根據證物提出推理，再由導師確認正式行動。</div>';
 $('publicMap').innerHTML=P.map();$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>connection('請使用裝置的全螢幕功能'));};
 sdk().then(()=>r.onValue(r.ref(r.db,`lupinRooms/${id}/public`),snap=>{if(!snap.exists()){connection('課堂已關閉或不存在',true);return;}lastPublic=snap.val();renderBoard(lastPublic);},e=>connection(readableError(e),true))).catch(e=>connection(readableError(e),true));
}
function renderBoard(v){
 $('announcement').textContent=v.announcement;
 const cells=[['目前回合',v.round?`R${v.round} / 4`:'未開始'],['精準查詢',`${v.queries} / 3`],['拘捕機會',`${v.arrests} / 2`],['防盜裝置',v.antiTheft?'可用':'已使用'],['出口封鎖',v.block?'可用':'已使用']];
 $('resources').innerHTML=cells.map(([name,value])=>`<div class="stat"><small>${esc(name)}</small><b>${esc(value)}</b></div>`).join('');
 $('outcome').hidden=!v.outcome;if(v.outcome){$('outcome').replaceChildren();const h=document.createElement('h2'),p=document.createElement('div');h.textContent=v.outcome.title;p.textContent=v.outcome.detail;$('outcome').append(h,p);$('outcome').className='result '+(v.outcome.type==='lose'?'lose':'outcome');}
 updateConnection();
}
window.addEventListener('offline',()=>{online=false;updateConnection();lockControls();});
window.addEventListener('online',()=>{online=dbConnected&&navigator.onLine;updateConnection();lockControls();});
if(mode==='board')startBoard(params.get('room'));else if(mode==='tutor')joinTutor();else if(mode==='control')controllerEntry();else initial();
