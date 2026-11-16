const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hingyinma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.TRADING_URL||'http://localhost:8797/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const hostContext=await browser.newContext({viewport:{width:1024,height:1366}}),publicContext=await browser.newContext({viewport:{width:1920,height:1080}});
 const host=await hostContext.newPage(),display=await publicContext.newPage(),errors=[],requests=[];
 host.on('pageerror',e=>errors.push(e.message));display.on('pageerror',e=>errors.push(e.message));display.on('request',r=>requests.push(r.url()));
 let room;
 try{
 await host.goto(base);await host.locator('#connection').filter({hasText:'已連線'}).waitFor();await host.locator('#create').click();await host.locator('#entryRows tr').nth(10).waitFor();
 await host.locator('#joinDisplay').click();const link=await host.locator('#publicLink').inputValue();room=new URL(link).searchParams.get('session');assert.match(room,/^[a-f0-9]{32}$/);assert.ok(link.includes('display.html'));assert.ok(!link.includes('owner'));
 if(base.startsWith('https:'))assert.equal(await host.locator('#qr svg').count(),1);else assert.equal(await host.locator('#qr svg').count(),0);
 await display.goto(link);await display.locator('#ranking tr').nth(10).waitFor();assert.equal(await display.locator('button,select,input').count(),0);assert.ok(!(await display.content()).includes('教師控制台'));
 const initial=await display.locator('#ranking').textContent();
 const row=host.locator('#entryRows tr[data-player="01"]');await row.locator('[data-action]').selectOption('buy');await row.locator('[data-product]').selectOption('gold');await row.locator('[data-quantity]').selectOption('3');
 assert.equal(await display.locator('#ranking').textContent(),initial);
 // Draft resumes on same host after a browser refresh; public still unchanged.
 await host.reload();await host.locator('#entryRows tr').nth(10).waitFor();assert.equal(await host.locator('[data-player="01"] [data-action]').inputValue(),'buy');
 const oldRoot=await host.evaluate(async room=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');return(await d.get(d.ref(d.getDatabase(),'tradingRooms/'+room))).val();},room);
 for(let round=1;round<=8;round++){
  await host.locator('#roundTitle').filter({hasText:`第 ${round} / 8`}).waitFor();
  console.log('Checking round',round);
  for(let i=1;i<=11;i++){
   const r=host.locator(`[data-player="${String(i).padStart(2,'0')}"]`);
   const special=round===8&&i===1;
   await r.locator('[data-action]').selectOption(special?'buy':round%2?'buy':'sell');await r.locator('[data-product]').selectOption(special?'blue':'gold');await r.locator('[data-quantity]').selectOption(special?'1':'3');
  }
  await host.locator('#preview').click();await host.locator('#confirm').click();
  await display.locator('#roundTitle').filter({hasText:round===8?'最終排名':`已完成第 ${round} 回合`}).waitFor();
  if(round===1){
   const stale=await host.evaluate(async({room,oldRoot})=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');try{await d.set(d.ref(d.getDatabase(),'tradingRooms/'+room),{...oldRoot,revision:2});return 'BAD';}catch(e){return e.code||e.message;}},{room,oldRoot});assert.match(stale,/permission.denied/i);
   await host.reload();await host.locator('#roundTitle').filter({hasText:'第 2 / 8'}).waitFor();
  }
 }
 assert.equal(await display.locator('.blue strong').textContent(),'110');assert.equal(await display.locator('.gold strong').textContent(),'100');assert.ok(await host.locator('#entryPanel').isHidden());
 const publicData=await display.evaluate(async room=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');return(await d.get(d.ref(d.getDatabase(),'tradingRooms/'+room+'/public'))).val();},room);
 assert.equal(publicData.completedRound,8);assert.equal(Object.values(publicData.ranking).find(p=>p.id==='02').netWorth,1060);
 assert.ok(!JSON.stringify(publicData).includes('holdings'));assert.ok(!requests.some(u=>/engine\.mjs|host\.mjs|firebase-auth\.js/.test(u)));
 // Unauthenticated audience cannot read private state, or write public prices.
 const security=await display.evaluate(async room=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');const database=d.getDatabase(),result={};for(const [label,task]of [['private',()=>d.get(d.ref(database,'tradingRooms/'+room+'/privateState'))],['write',()=>d.set(d.ref(database,'tradingRooms/'+room+'/public/prices/blue'),1)]]){try{await task();result[label]='BAD';}catch(e){result[label]=e.code||e.message;}}return result;},room);for(const code of Object.values(security))assert.match(code,/permission.denied/i);
 // A separately authenticated anonymous host is also denied access to this game.
 const outsider=await display.evaluate(async room=>{const a=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');await a.signInAnonymously(a.getAuth());try{await d.get(d.ref(d.getDatabase(),'tradingRooms/'+room));return 'BAD';}catch(e){return e.code||e.message;}},room);assert.match(outsider,/permission.denied/i);
 // Refresh and reconnect recover the last committed public snapshot.
 await display.reload();await display.locator('#roundTitle').filter({hasText:'最終排名'}).waitFor();
 await display.evaluate(async()=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');d.goOffline(d.getDatabase());});await display.locator('#connection').filter({hasText:'連線中斷'}).waitFor();assert.equal(await display.locator('.blue strong').textContent(),'110');
 await display.evaluate(async()=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');d.goOnline(d.getDatabase());});await display.locator('#connection').filter({hasText:'即時連線'}).waitFor();
 fs.mkdirSync('tmp/trading-qa',{recursive:true});await display.screenshot({path:'tmp/trading-qa/display.png',fullPage:true});await host.screenshot({path:'tmp/trading-qa/host-tablet.png',fullPage:true});
 assert.ok(await display.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await display.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'16:9 display should fit one screen');
 await display.setViewportSize({width:1366,height:768});await display.screenshot({path:'tmp/trading-qa/display-1366.png',fullPage:true});assert.ok(await display.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'1366x768 board should fit');
 // Deliberate rollback updates both independent sessions.
 host.once('dialog',d=>d.accept());await host.locator('summary').filter({hasText:'教學工具及備份'}).click();await host.locator('#undo').click();await display.locator('#roundTitle').filter({hasText:'已完成第 7 回合'}).waitFor();assert.equal(await display.locator('.blue strong').textContent(),'100');
 await host.setViewportSize({width:390,height:844});await host.screenshot({path:'tmp/trading-qa/host-mobile.png',fullPage:true});assert.ok(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({base,session:room,passed:['11 players / 8 rounds','independent public browser','draft refresh','committed snapshots only','final closing update','stale revision denied','audience and other host denied private access/write','public refresh and reconnect','undo sync','mobile and 1920x1080 layouts'],publicQR:base.startsWith('https:')},null,2));
 }finally{
  if(room)await host.evaluate(async room=>{const d=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');await d.remove(d.ref(d.getDatabase(),'tradingRooms/'+room));},room).catch(()=>{});
  for(const page of [host,display])await page.evaluate(async()=>{const a=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');if(a.getAuth().currentUser)await a.deleteUser(a.getAuth().currentUser);}).catch(()=>{});
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
