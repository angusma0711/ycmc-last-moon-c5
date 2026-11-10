const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const pages=await Promise.all([0,1,2].map(async()=> (await browser.newContext()).newPage()));
 const [board,a,b]=pages;
 let pair,room;
 async function db(page,path,operation='get',value){
  return page.evaluate(async ({path,operation,value})=>{
   const sdk=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js');
   const ref=sdk.ref(sdk.getDatabase(),path);
   if(operation==='get')return (await sdk.get(ref)).val();
   if(operation==='remove')return sdk.remove(ref);
   return sdk.update(ref,value);
  },{path,operation,value});
 }
 try{
  await board.goto(process.env.LUPIN_URL||'http://127.0.0.1:8796/');
  await board.locator('#createPair').click();
  const control=await board.locator('details a').getAttribute('href');
  pair=new URLSearchParams(new URL(control).hash.slice(1)).get('pair');
  await a.goto(control);await a.locator('#claimController').click();await a.locator('#startGame').waitFor();
  await board.locator('#publicMap').waitFor();room=new URLSearchParams(new URL(board.url()).hash.slice(1)).get('room');
  await a.getByText('課堂工具',{exact:true}).click();
  await a.getByText('邀請第二位導師',{exact:true}).click();
  const invite=await a.locator('#inviteArea a').getAttribute('href');
  await b.goto(invite);await b.locator('#joinTutor').click();await b.locator('#startGame').waitFor();
  await a.locator('#startGame').click();await b.locator('#commitMove').click();
  await Promise.all(pages.slice(1).map(p=>p.locator('#queryBtn').waitFor()));
  const old=await db(a,'lupinRooms/'+room);
  await Promise.all(pages.slice(1).map(p=>p.locator('#queryBtn').evaluate(button=>button.click())));
  await b.waitForFunction(()=>document.querySelector('#queryBtn')?.disabled && document.querySelector('#summary').textContent.includes('2 / 3'));
  await a.waitForFunction(()=>document.querySelector('#summary').textContent.includes('2 / 3'));
  await assert.rejects(db(b,'lupinRooms/'+room,'update',{revision:old.revision+1,privateState:old.privateState,public:old.public}));
  assert.equal((await db(b,'lupinRooms/'+room+'/public')).queries,2);
  await assert.rejects(db(board,'lupinRooms/'+room+'/privateState'));
  await assert.rejects(db(board,'lupinTeams/'+room));
  assert.equal(await board.locator('#controls').count(),0);
  await b.reload();await b.locator('#joinTutor').click();await b.locator('#actBtn').click();
  await a.locator('#endRound').click();await b.locator('#commitMove').waitFor();
  await board.waitForFunction(()=>document.querySelector('#resources').textContent.includes('R2 / 4'));
  console.log('PASS two tutor phones, concurrent query, stale write denied, private reads denied, co-tutor reload and public round sync');
 }finally{
  if(room){await db(a,'lupinTeams/'+room,'remove').catch(()=>{});await db(a,'lupinRooms/'+room,'remove').catch(()=>{});}
  if(pair)await db(board,'lupinPairings/'+pair,'remove').catch(()=>{});
  for(const p of pages)await p.evaluate(async()=>{const a=await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');if(a.getAuth().currentUser)await a.deleteUser(a.getAuth().currentUser);}).catch(()=>{});
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
