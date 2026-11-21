export const PRODUCTS = Object.freeze({blue:'藍水晶',gold:'黃金鐘',red:'紅藥水'});
const keys = Object.keys(PRODUCTS);
const copy = value => structuredClone(value);
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
export function createGame(count=11,totalRounds=8,names=[]) {
  if (!Number.isInteger(count)||count<2||count>12||![6,8,10].includes(totalRounds)) throw Error('人數須為 2–12，回合須為 6、8 或 10。');
  return {schemaVersion:4,totalRounds,completedRound:0,prices:{blue:100,gold:100,red:100},players:Array.from({length:count},(_,i)=>({id:String(i+1).padStart(2,'0'),name:String(names[i]||'').trim().slice(0,20),cash:1000,holdings:{blue:0,gold:0,red:0}})),history:[]};
}
export function netWorth(player,prices) {return player.cash+keys.reduce((n,k)=>n+player.holdings[k]*prices[k],0);}
export function validateOrder(player,order,prices) {
  if (!order || order.action==='hold') return '';
  const {action,product,quantity:q}=order;
  if (!['buy','sell'].includes(action)||!keys.includes(product)||![1,2,3].includes(q)) return '請選擇一項商品及 1–3 件。';
  if (action==='buy' && player.cash<(prices[product]+5)*q) return '現金不足（包括每件 5 幣手續費）。';
  if (action==='buy' && player.holdings[product]+q>6) return '該商品持貨上限為 6 件。';
  if (action==='sell' && player.holdings[product]<q) return '持貨不足，不能賣出。';
  return '';
}
export function nextPrices(openingPrices,volumes,round,totalRounds) {
  const cap=round===totalRounds?10:20;
  return {
    blue:clamp(openingPrices.blue+clamp(10*(volumes.blue.buy-volumes.blue.sell),-cap,cap),60,160),
    gold:clamp(openingPrices.gold+(round%2===1?15:-15),60,160),
    red:clamp(openingPrices.red+clamp(-10*(volumes.red.buy-volumes.red.sell),-cap,cap),60,160)
  };
}
export function settle(game,orders={}) {
  if (game.completedRound>=game.totalRounds) throw Error('遊戲已完成，沒有下一輪交易。');
  if (!orders||typeof orders!=='object'||Array.isArray(orders)||Object.keys(orders).some(id=>!game.players.some(p=>p.id===id))) throw Error('交易名單不符。');
  const state=copy(game),round=state.completedRound+1;
  const volumes=Object.fromEntries(keys.map(k=>[k,{buy:0,sell:0}]));
  const normalized={},results=[];
  for (const player of state.players) {
    const order=copy(orders[player.id]||{action:'hold'});
    normalized[player.id]=order.action==='hold'?{action:'hold'}:order;
    const error=validateOrder(player,order,state.prices);
    let fee=0;
    if (!error && order.action!=='hold') {
      const {action,product,quantity:q}=order;fee=5*q;
      player.cash+=(action==='buy'?-state.prices[product]*q:state.prices[product]*q)-fee;
      player.holdings[product]+=action==='buy'?q:-q;
      volumes[product][action]+=q;
    }
    results.push({id:player.id,order:normalized[player.id],executed:!error,error,fee});
  }
  const closingPrices=nextPrices(state.prices,volumes,round,state.totalRounds);
  state.history.push({round,openingPrices:copy(state.prices),closingPrices:copy(closingPrices),beforePlayers:copy(game.players),orders:normalized,results,volumes});
  state.prices=closingPrices;state.completedRound=round;
  return state;
}
export function undo(game) {
  if (!game.history.length) throw Error('尚未結算任何回合。');
  const state=copy(game),last=state.history.pop();
  state.players=last.beforePlayers;state.prices=last.openingPrices;state.completedRound--;
  return state;
}
// Explicit public allowlist: never spread host state or player objects here.
export function publicSnapshot(game,updatedAt=Date.now()) {
  const last=game.history.at(-1),ranking=game.players.map(p=>({id:p.id,name:p.name,cash:p.cash,netWorth:netWorth(p,game.prices)})).sort((a,b)=>b.netWorth-a.netWorth||a.id.localeCompare(b.id));
  let rank=0,previous;
  ranking.forEach((p,i)=>{if(p.netWorth!==previous)rank=i+1;p.rank=rank;previous=p.netWorth;});
  return {title:'秘密股票交易所',completedRound:game.completedRound,nextRound:Math.min(game.completedRound+1,game.totalRounds),totalRounds:game.totalRounds,status:game.completedRound===game.totalRounds?'finished':'waiting',prices:{blue:game.prices.blue,gold:game.prices.gold,red:game.prices.red},trends:Object.fromEntries(keys.map(k=>[k,[100,...game.history.map(h=>h.closingPrices[k])]])),volumes:Object.fromEntries(keys.map(k=>[k,{buy:last?.volumes[k].buy||0,sell:last?.volumes[k].sell||0}])),ranking,updatedAt};
}
export function importGame(raw) {
  if (!raw||raw.schemaVersion!==4||!Array.isArray(raw.players)||!Array.isArray(raw.history)||raw.history.length>10) throw Error('備份格式不正確。');
  let rebuilt=createGame(raw.players.length,raw.totalRounds,raw.players.map(p=>p.name));
  for (const entry of raw.history) rebuilt=settle(rebuilt,entry.orders);
  if (JSON.stringify(rebuilt)!==JSON.stringify(raw)) throw Error('備份與交易紀錄不一致，未匯入。');
  return rebuilt;
}
