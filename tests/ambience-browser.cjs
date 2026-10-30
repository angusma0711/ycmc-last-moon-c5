const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
fs.mkdirSync('tmp/pdfs/midnight-13',{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const desktop=await browser.newContext({viewport:{width:1440,height:900}}),mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const board=await desktop.newPage(),phone=await mobile.newPage();let pair,room;const errors=[];
 for(const p of [board,phone])p.on('pageerror',e=>errors.push(e.message));
 await board.addInitScript(()=>{
  let Music;Object.defineProperty(globalThis,'MidnightAmbience',{configurable:true,get:()=>Music,set:Base=>{Music=class extends Base{constructor(...args){super(...args);window.__music=this;}};}});window.audioTrace=[];window.phaseTrace=[];const watched=new WeakSet(),play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   if(!watched.has(this)){watched.add(this);for(const name of ['playing','waiting','ended','pause','error','loadedmetadata'])this.addEventListener(name,()=>window.audioTrace.push({event:name,file:this.src.split('/').pop(),time:performance.now(),current:this.currentTime,duration:Number.isFinite(this.duration)?this.duration:null,ended:this.ended,volume:this.volume}));}
   window.audioTrace.push({event:'play-request',file:this.src.split('/').pop(),time:performance.now(),current:this.currentTime,duration:Number.isFinite(this.duration)?this.duration:null,volume:this.volume});return play.call(this);
  };
  addEventListener('DOMContentLoaded',()=>{let prev='';const observe=()=>{const root=document.getElementById('scare');if(!root)return;const phase=root.style.display==='flex'?['s1','s2','s3'].filter(id=>document.getElementById(id).style.display!=='none').join('+'):'off';if(phase!==prev){prev=phase;window.phaseTrace.push({phase,time:performance.now()});}};new MutationObserver(observe).observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['style']});observe();});
 });
 try{
  const base=process.env.MIDNIGHT_URL||'http://127.0.0.1:8792/';await board.goto(base);await board.locator('#create').click();await board.locator('#qr svg').waitFor({timeout:30000});const control=await board.locator('details a').getAttribute('href');pair=new URLSearchParams(new URL(control).hash.slice(1)).get('pair');await phone.goto(control);await phone.locator('#claim').click();await phone.locator('#controlTitle').waitFor({timeout:30000});await board.locator('#stage:not([hidden])').waitFor({timeout:30000});room=new URLSearchParams(new URL(board.url()).hash.slice(1)).get('room');
  await board.locator('#audioUnlock').click();await board.locator('#audioUnlock').waitFor({state:'hidden'});await board.waitForFunction(()=>window.__music?.target>0);
  assert(await board.evaluate(()=>window.__music.source.loop));
  const musicTime=await board.evaluate(()=>window.__music.context.currentTime);
  console.log('PASS background score starts only after board audio unlock');
  await phone.locator('#bgmControl').click();await board.waitForFunction(()=>window.__music.target===0);
  await phone.locator('#bgmControl').click();await board.waitForFunction(()=>window.__music.target>0);
  await phone.locator('#bgmVolume').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('change',{bubbles:true}));});await board.waitForFunction(()=>Math.abs(window.__music.target-.1125)<.0001);
  await phone.locator('#muteControl').click();await board.waitForFunction(()=>window.__music.target===0);
  await phone.locator('#muteControl').click();await board.waitForFunction(()=>window.__music.target>0);
  console.log('PASS phone music toggle, independent volume and global mute');
  await phone.locator('[data-action="stage"][data-value="1"]').click();await board.locator('[data-v="1"].on').waitFor();assert(await board.evaluate(()=>window.__music.target>0));
  await phone.locator('[data-action="stage"][data-value="2"]').click();await board.locator('[data-v="2"].on').waitFor();
  await board.evaluate(()=>{window.audioTrace=[];window.phaseTrace=[];});
  await phone.locator('#scareControl').click();await board.waitForFunction(()=>window.phaseTrace.some(e=>e.phase==='s1'),{},{timeout:20000});await board.waitForFunction(()=>window.__music.target>0&&window.__music.target<.02);console.log('PASS background music ducks during scare');
  await board.waitForFunction(()=>window.phaseTrace.some(e=>e.phase==='s3')&&window.phaseTrace.at(-1)?.phase==='off',{},{timeout:25000});
  const trace=await board.evaluate(()=>({audio:window.audioTrace,phases:window.phaseTrace}));fs.writeFileSync('tmp/pdfs/midnight-13/live-audio-timing.json',JSON.stringify(trace,null,2));
  console.log(JSON.stringify(trace,null,2));
  for(const file of ['scare-1-ghost.wav','scare-2-ghost.wav']){
   const end=trace.audio.find(e=>e.file===file&&e.event==='ended');assert(end,'Missing natural ended event: '+file);assert(Math.abs(end.current-end.duration)<0.03,'Incomplete playback: '+file);
   console.log('PASS full natural playback',file,end.duration.toFixed(3)+'s');
  }
  const firstEnd=trace.audio.find(e=>e.file==='scare-1-ghost.wav'&&e.event==='ended').time,secondPlay=trace.audio.find(e=>e.file==='scare-2-ghost.wav'&&e.event==='playing').time;
  assert(firstEnd<=secondPlay,'Voice lines overlap');assert.equal(trace.phases.map(e=>e.phase).join(','),'s1,s2,s3,off');assert.deepEqual(errors,[]);
  await board.locator('#photoNote').waitFor({state:'visible'});assert(await phone.locator('#scareControl').isDisabled());console.log('PASS both voice lines finish naturally with music ducking');await board.waitForFunction(()=>window.__music.target>.1);await board.waitForFunction(start=>window.__music.context.currentTime>start+33,musicTime,{timeout:45000});console.log('PASS music remains active beyond full 32-second loop');await phone.screenshot({path:'tmp/pdfs/midnight-13/phone-music.png',fullPage:true});console.log('BACKGROUND MUSIC QA PASSED');
 }finally{
  for(const [p,path] of [[phone,room&&'midnightRooms/'+room],[board,pair&&'midnightPairings/'+pair]])if(path)try{await p.evaluate(async path=>{const m=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');await m.remove(m.ref(m.getDatabase(),path));},path);}catch(e){console.log('Cleanup failed',e.message);}
  for(const p of [phone,board])try{await p.evaluate(async()=>{const m=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');await m.deleteUser(m.getAuth().currentUser);});}catch{}
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
