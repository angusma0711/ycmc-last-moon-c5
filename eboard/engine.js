(function(root){
'use strict';
const TITLES=['序幕 · 午夜旅館','第一幕 · 最後進入教室的人','第二幕 · 錯誤的午夜','第三幕 · 最後一段記憶','結局 · 退房'];
const BUDGET=[300,780,1320,780,120];
const HINTS=[['先聽經理介紹，然後打開第一幕角色卡。','每個人都有一份別人沒有的資料。','一起合作，沒有人會被淘汰。'],['名冊、房卡、門鎖——三份紀錄講的是同一段時間嗎？','C 卡屬於誰？卡的主人自己怎樣說？卡有沒有借出？','有沒有人親眼看見那個時間進門的人？找找照片和目擊者。'],['每一個時間，是從哪一個鐘讀出來的？','把鐘樓顯示的時間和手錶、相機比較，差了多少？','23:15 被開啟的設備，之後有人把它關掉嗎？'],['哪一段錄音裏，旋律已經在背景播放？哪一段還沒有？','哪一段有很多人的聲音？哪一段只剩一個人自言自語？','十二下鐘聲屬於哪個時刻？最後別忘了留聲機還在循環。'],[]];
const CAUSES=[['sab','有人蓄意破壞留聲機'],['clock','只因為鐘樓壞了'],['comm','時間及設備資訊沒有妥善傳達'],['ghost','幽靈作祟']];
function fresh(gameId='new'){return {gameId,stage:0,memory:0,players:8,timer:{remaining:300,endAt:0},hintLevel:0,hintShown:false,scareAt:0,scareUsed:false,photo:false,seq:[],loopOn:true,cause:'',feedback:'',muted:false,vol:50,audio:{clip:'',eventId:'',at:0},updatedAt:0};}
function remaining(s,now=Date.now()){return s.timer.endAt?Math.max(0,Math.ceil((s.timer.endAt-now)/1000)):s.timer.remaining;}
function stage(s,n,now){if(!Number.isInteger(n)||n<0||n>4)throw Error('無效幕次');s.stage=n;s.hintLevel=0;s.hintShown=false;s.feedback='';s.scareAt=0;s.timer={remaining:BUDGET[n],endAt:n===4?0:now+BUDGET[n]*1000};if(n===4)s.memory=100;}
function action(s,name,value,now=Date.now()){
 switch(name){
 case 'stage':stage(s,+value,now);break;
 case 'pass1':s.memory=33;stage(s,2,now);break;
 case 'pass2':s.memory=66;stage(s,3,now);break;
 case 'forceEnd':stage(s,4,now);break;
 case 'timer':{const r=remaining(s,now);s.timer={remaining:r,endAt:s.timer.endAt?0:now+r*1000};break;}
 case 'duration':{const n=+value;if(!Number.isInteger(n)||n<1||n>3600)throw Error('請輸入 1–3600 秒');s.timer={remaining:n,endAt:0};break;}
 case 'nextHint':s.hintLevel=Math.min(3,s.hintLevel+1);s.hintShown=true;break;
 case 'hideHint':s.hintShown=false;break;
 case 'clearHint':s.hintLevel=0;s.hintShown=false;break;
 case 'scare':if(s.stage===2&&!s.scareUsed){s.scareAt=now;s.scareUsed=true;}break;
 case 'skipScare':s.scareAt=0;s.scareUsed=true;s.photo=true;break;
 case 'mute':s.muted=!s.muted;break;
 case 'volume':if(!Number.isFinite(+value))throw Error('無效音量');s.vol=Math.min(100,Math.max(0,+value));break;
 case 'players':if(![8,9,10,11].includes(+value))throw Error('人數須為 8–11 人');s.players=+value;break;
 case 'fragment':if(s.stage===3&&['甲','乙','丙','丁'].includes(value)&&!s.seq.includes(value))s.seq.push(value);s.feedback='';break;
 case 'clear':if(s.stage===3)s.seq=[];s.feedback='';break;
 case 'loop':if(s.stage===3)s.loopOn=!s.loopOn;s.feedback='';break;
 case 'cause':if(s.stage===3&&CAUSES.some(c=>c[0]===value))s.cause=value;s.feedback='';break;
 case 'submit':if(s.stage!==3)break;if(s.seq.length<4)s.feedback='還有錄音碎片未排列。';else if(s.seq.join('')==='乙丁甲丙'&&!s.loopOn&&s.cause==='comm')stage(s,4,now);else s.feedback='記憶仍然不穩定……請回到證據，再核對一次。';break;
 default:throw Error('未知操作');
 }
 return s;
}
function normalize(v){return {...fresh(v.gameId),...v,seq:Array.isArray(v.seq)?v.seq:[],timer:{...fresh().timer,...v.timer},audio:{...fresh().audio,...v.audio}};}
const api={TITLES,BUDGET,HINTS,CAUSES,fresh,remaining,action,normalize};root.Midnight=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
