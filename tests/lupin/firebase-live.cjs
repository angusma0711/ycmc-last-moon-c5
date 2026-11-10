const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),P=require('../../eboard/lupin/public.js');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../../eboard/lupin/firebase-config.js','utf8'),ctx);const cfg=ctx.MOON_FIREBASE_CONFIG,random=()=>crypto.randomBytes(16).toString('hex'),pair=random(),expired=random(),key=random(),room=random();let desktop,phone,other;
async function account(){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+cfg.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});assert(r.ok);return r.json();}
async function db(path,method='GET',data,a){const u=new URL(cfg.databaseURL+'/'+path+'.json');if(a)u.searchParams.set('auth',a.idToken);return fetch(u,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});}
async function ok(r,label){const t=await r.text();assert(r.ok,label+': '+t);console.log('PASS',label);return t;}
async function deny(r,label){assert(!r.ok,label);console.log('PASS denied:',label);}
(async()=>{try{
 desktop=await account();phone=await account();other=await account();
 await ok(await db('lupinPairings/'+pair,'PUT',{owner:desktop.localId,key,createdAt:Date.now()},desktop),'desktop creates pairing');
 await deny(await db('lupinPairings/'+pair),'public pairing read');
 await deny(await db('lupinPairings/'+pair+'/claim','PUT',{uid:phone.localId,key:random()},phone),'wrong QR key');
 await ok(await db('lupinPairings/'+pair+'/claim','PATCH',{uid:phone.localId,key},phone),'phone claims');
 await ok(await db('lupinRooms/'+room,'PUT',{owner:phone.localId,public:{...P.initial(),updatedAt:Date.now()}},phone),'phone creates public-only room');
 await ok(await db('lupinPairings/'+pair+'/claim','PUT',{uid:phone.localId,key,room},phone),'phone publishes room pointer');
 await deny(await db('lupinPairings/'+pair+'/claim','PUT',{uid:other.localId,key},other),'second phone takeover');
 await ok(await db('lupinPairings/'+pair+'/claim','PATCH',{uid:phone.localId,key},phone),'same phone resumes');
 assert.equal(JSON.parse(await ok(await db('lupinPairings/'+pair+'/claim/room','GET',undefined,phone),'phone resume pointer')),room);
 await ok(await db('lupinRooms/'+room+'/public'),'unauthenticated public screen read');
 await deny(await db('lupinRooms'),'room enumeration');await deny(await db('lupinRooms/'+room),'room root read');await deny(await db('lupinRooms/'+room+'/owner'),'owner identity read');
 await deny(await db('lupinRooms/'+room+'/public/round','PUT',1,desktop),'display cannot change round');
 for(const field of ['position','previous','jewel','smoke','queryResult','history','lastAction'])await deny(await db(`lupinRooms/${room}/public/${field}`,'PUT','PRIVATE',phone),'private field '+field);
 await ok(await db('lupinRooms/'+room+'/public/round','PUT',1,phone),'owner public update');
 await ok(await db('lupinPairings/'+expired,'PUT',{owner:desktop.localId,key,createdAt:Date.now()-660000},desktop),'expired ticket setup');
 await deny(await db('lupinPairings/'+expired+'/claim','PUT',{uid:other.localId,key},other),'expired QR');
 console.log('LUPIN LIVE SECURITY PASSED');
 }finally{
 if(phone)await db('lupinRooms/'+room,'DELETE',undefined,phone);if(desktop)for(const id of [pair,expired])await db('lupinPairings/'+id,'DELETE',undefined,desktop);
 for(const a of [desktop,phone,other].filter(Boolean))await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+cfg.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:a.idToken})});console.log('Synthetic resources cleaned up');
 }})().catch(e=>{console.error(e);process.exitCode=1;});
