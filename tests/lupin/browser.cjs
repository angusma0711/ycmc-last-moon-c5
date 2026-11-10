const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
fs.mkdirSync('tmp/lupin-qa',{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const screen=await browser.newContext({viewport:{width:1440,height:950}}),mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const board=await screen.newPage(),phone=await mobile.newPage();const errors=[];for(const p of [board,phone])p.on('pageerror',e=>{errors.push(e.message);console.log('Runtime error',e.message)});
 const base=process.env.LUPIN_URL||'http://127.0.0.1:8794/';let pair,room,display2;
 const roundIs=n=>board.waitForFunction(n=>document.querySelector('#resources')?.textContent.includes(`R${n} / 4`),n);
 async function move(z){await phone.locator('#nextZone').selectOption(z);await phone.locator('#commitMove').click();await phone.locator('#actBtn').waitFor();}
 async function act(type,z){await phone.locator('#actionType').selectOption(type);if(z)await phone.locator('#actionZone').selectOption(z);await phone.locator('#actBtn').click();}
 async function next(){await phone.locator('#endRound').click();await phone.locator('#commitMove').waitFor();}
 async function reset(){phone.once('dialog',d=>d.accept());await phone.locator('#resetBtn').click();await phone.locator('#startGame').waitFor();await board.waitForFunction(()=>document.querySelector('#resources').textContent.includes('未開始'));}
 async function begin(z='A'){await phone.locator('#startZone').selectOption(z);await phone.locator('#startGame').click();await phone.locator('#commitMove').waitFor();await roundIs(1);}
 try{
  await board.goto(base);await board.locator('#createPair').click();await board.locator('#controllerQR svg').waitFor({timeout:30000});
  const control=await board.locator('details a').getAttribute('href');pair=new URLSearchParams(new URL(control).hash.slice(1)).get('pair');await phone.goto(control);await phone.locator('#claimController').click();await phone.locator('#startGame').waitFor({timeout:30000});await board.locator('#publicMap svg').waitFor({timeout:30000});room=new URLSearchParams(new URL(board.url()).hash.slice(1)).get('room');
  assert(room);assert(!board.url().includes('key='));assert.equal(await board.locator('#controls').count(),0);assert.equal(await board.locator('#closePublic').count(),0);assert.equal(await board.locator('#controllerQR').count(),0);
  assert(await board.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('lupin-private-'))));console.log('PASS QR phone pairing; display has no private controls, state or back door');
  display2=await screen.newPage();display2.on('pageerror',e=>errors.push(e.message));await display2.goto(board.url());await display2.locator('#publicMap svg').waitFor();
  await begin();await move('B');await phone.locator('#queryZone').selectOption('B');await phone.locator('#queryBtn').click();assert(await phone.locator('#queryBtn').isDisabled());assert((await phone.locator('#controls').innerText()).includes('有 Lupin'));
  await act('arrest','B');assert((await phone.locator('#secretPanel').innerText()).includes('已用'));assert((await phone.locator('#secretPanel').innerText()).includes('B · 古董展區'));await board.waitForFunction(()=>document.querySelector('#resources').textContent.includes('1 / 2'));
  assert(!(await board.locator('body').innerText()).includes('A 組查詢 B 區'));assert.equal(await board.locator('.zone.secret').count(),0);assert.equal(await board.locator('.badgecircle').count(),0);
  const snapshot=await board.evaluate(async room=>{const m=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');return(await m.get(m.ref(m.getDatabase(),'lupinRooms/'+room+'/public'))).val();},room);
  for(const key of ['position','previous','jewel','smoke','queryResult','actionResult','history','lastAction','viewSecret'])assert(!(key in snapshot));console.log('PASS query and smoke stay private; cloud has only whitelisted public data');
  await phone.screenshot({path:'tmp/lupin-qa/phone-private.png',fullPage:true});await board.screenshot({path:'tmp/lupin-qa/board-public.png',fullPage:true});
  await mobile.setOffline(true);await phone.locator('#endRound').waitFor({state:'visible'});await phone.waitForFunction(()=>document.getElementById('endRound').disabled);assert(await phone.locator('#exportBtn').isEnabled());await mobile.setOffline(false);await phone.waitForFunction(()=>!document.getElementById('endRound').disabled,{},{timeout:30000});assert(await phone.locator('#queryBtn').isDisabled());console.log('PASS offline locks game actions and reconnect preserves used-query lock');
  await phone.reload();await phone.locator('#claimController').click();await phone.locator('#endRound').waitFor({timeout:30000});assert((await phone.locator('#secretPanel').innerText()).includes('B · 古董展區'));assert((await phone.locator('#secretPanel').innerText()).includes('已用'));console.log('PASS same phone resumes private progress after reload');
  await next();await roundIs(2);await move('C');await act('anti','C');assert((await phone.locator('#secretPanel').innerText()).includes('在 C 展室'));
  await next();await move('D');await act('none');await next();await move('C');await act('arrest','C');await board.waitForFunction(()=>document.querySelector('#outcome').textContent.includes('完全勝利'));await display2.waitForFunction(()=>document.querySelector('#outcome').textContent.includes('完全勝利'));console.log('PASS V6 smoke, anti-theft and second arrest; two public screens show win');
  const download=phone.waitForEvent('download');await phone.locator('#exportBtn').click();const file=await download;assert(file.suggestedFilename().startsWith('Lupin_R4_'));const backup=fs.readFileSync(await file.path());console.log('PASS private JSON export remains available');await reset();phone.once('dialog',d=>d.accept());await phone.locator('#importFile').setInputFiles({name:'Lupin_backup.json',mimeType:'application/json',buffer:backup});await board.waitForFunction(()=>document.querySelector('#outcome').textContent.includes('完全勝利'));console.log('PASS original V6 private backup imports and updates public result');
  await reset();await begin();for(const [i,z] of ['B','C','D','F'].entries()){await move(z);await act('none');if(i<3)await next();}await board.waitForFunction(()=>document.querySelector('#outcome').textContent.includes('成功逃脫'));console.log('PASS V6 theft and escape lose condition');
  await reset();await begin('F');for(const [i,z] of ['E','A','B','D'].entries()){await move(z);await act('none');if(i<3)await next();}await phone.locator('#endRound').click();await board.waitForFunction(()=>document.querySelector('#outcome').textContent.includes('部分成功'));console.log('PASS V6 four-round partial success');
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('LUPIN BROWSER QA PASSED');
 }catch(e){console.log('Phone status:',await phone.locator('body').innerText());await phone.screenshot({path:'tmp/lupin-qa/failure.png',fullPage:true});throw e;}
 finally{
  for(const [p,path] of [[phone,room&&'lupinRooms/'+room],[board,pair&&'lupinPairings/'+pair]])if(path)try{await p.evaluate(async path=>{const m=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');await m.remove(m.ref(m.getDatabase(),path));},path);}catch(e){console.log('Cleanup',e.message)}
  for(const p of [phone,board])try{await p.evaluate(async()=>{const m=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');await m.deleteUser(m.getAuth().currentUser);});}catch{}
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
