import {watchPublic} from './cloud.mjs';
import {el,products,pricesView,showMessage} from './view.mjs';
const $=id=>document.getElementById(id);
const session=new URL(location.href).searchParams.get('session');
function render(data) {
  showMessage('');
  const final=data.status==='finished';
  $('roundTitle').textContent=final?`最終排名 · ${data.totalRounds} 回合完成`:(data.completedRound?`已完成第 ${data.completedRound} 回合 · 下一輪 ${data.nextRound}`:'準備開始 · 第 1 回合');
  $('phase').textContent=final?'已按最後收市價計算總資產':'等待本輪結算';
  pricesView($('prices'),data.prices,data.trends,data.totalRounds);
  $('ranking').replaceChildren();
  for(const player of Object.values(data.ranking)) {
    const tr=el('tr');
    for(const value of [player.rank,player.id+(player.name?' · '+player.name:''),player.cash.toLocaleString(),player.netWorth.toLocaleString()])tr.append(el('td',String(value)));
    $('ranking').append(tr);
  }
  $('volumeTitle').textContent=data.completedRound?`第 ${data.completedRound} 回合全班成交件數`:'尚未有成交';
  $('volumes').replaceChildren();
  for(const [key,name] of Object.entries(products)) {
    const row=el('div',undefined,'volume');row.append(el('strong',name),el('span',`買 ${data.volumes[key].buy}　／　賣 ${data.volumes[key].sell}`));$('volumes').append(row);
  }
  $('updated').textContent='最後結算更新：'+new Date(data.updatedAt).toLocaleTimeString('zh-HK');
}
try {
  const stop=await watchPublic(session,render,(text,online)=>{$('connection').textContent=text;$('connection').classList.toggle('offline',!online);},showMessage);
  addEventListener('pagehide',stop,{once:true});
}catch(error){showMessage(error);$('connection').textContent='未能連接課堂';}
