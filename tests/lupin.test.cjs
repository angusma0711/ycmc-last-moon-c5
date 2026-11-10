const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=fs.existsSync(path.join(__dirname,'../eboard/public.js'))?path.join(__dirname,'../eboard'):path.join(__dirname,'../eboard/lupin');
const P=require(path.join(dir,'public.js'));
test('private position, query answers and history never enter public snapshots',()=>{
 const s={...P.initial(),publicAnnouncement:'公開線索',position:'SECRET_POSITION',previous:'SECRET_PREVIOUS',jewel:true,smoke:false,queryResult:'SECRET_QUERY',actionResult:'SECRET_ACTION',history:[{msg:'SECRET_HISTORY'}],lastAction:{zone:'SECRET_ZONE'},viewSecret:true,result:null};
 const v=P.fromPrivate(s);assert(!JSON.stringify(v).includes('SECRET_'));assert.deepEqual(Object.keys(v).sort(),['round','phase','queries','arrests','antiTheft','block','announcement','outcome'].sort());assert.equal(v.announcement,'公開線索');
});
test('public map has only six fixed zones and eight legal corridors',()=>{const svg=P.map();assert.equal((svg.match(/<g class=/g)||[]).length,6);assert.equal((svg.match(/<line /g)||[]).length,8);assert(!svg.includes('badgecircle'));assert(!svg.includes(' secret'));});
test('end result is published without copying private result properties',()=>{const s={...P.initial(),publicAnnouncement:'任務結束',result:{type:'win',title:'已拘捕',detail:'寶石追回',position:'SECRET_POSITION'}};assert.deepEqual(P.fromPrivate(s).outcome,{type:'win',title:'已拘捕',detail:'寶石追回'});});
test('phone-only template has no projected overlay or return-to-controller control',()=>{const html=fs.readFileSync(path.join(dir,'controller.html'),'utf8');assert(!html.includes('id="publicScreen"'));assert(!html.includes('id="closePublic"'));assert(html.includes('id="exportBtn"'));assert(html.includes('id="importBtn"'));});
