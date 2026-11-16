import {PRODUCTS,createGame,validateOrder,settle,undo,publicSnapshot,netWorth,importGame} from './engine.mjs';
import {hostConnection,configured} from './cloud.mjs';
import {el,pricesView,showMessage} from './view.mjs';
const $=id=>document.getElementById(id);
let connection,session,state,revision=0,drafts={},touched={},candidate,stop,online=false,busy=false;
const actionNames={hold:'持有',buy:'買入',sell:'賣出'};
const draftKey=()=>`trading-draft-${session}-${revision}`;
function setBusy(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value);$('confirm').disabled=value||!online;if(state){entryStatus();$('undo').disabled=value||!online||!state.history.length;document.querySelectorAll('#entryRows tr').forEach(row=>validateRow(row.dataset.player,row));}}
function clearPreview() {candidate=null;$('previewPanel').hidden=true;}
function changeDraft(id,row){
  drafts[id]={action:row.querySelector('[data-action]').value,product:row.querySelector('[data-product]').value,quantity:Number(row.querySelector('[data-quantity]').value)};
  touched[id]=true;clearPreview();localStorage.setItem(draftKey(),JSON.stringify({drafts,touched}));validateRow(id,row);entryStatus();
}
function validateRow(id,row){const order=drafts[id]||{action:'hold'},warning=validateOrder(state.players.find(p=>p.id===id),order,state.prices);row.querySelector('.warning').textContent=warning|| (touched[id]?'已輸入':'預設持有');row.classList.toggle('invalid',Boolean(warning));row.querySelector('[data-action]').disabled=busy;row.querySelectorAll('[data-product],[data-quantity]').forEach(input=>input.disabled=order.action==='hold'||busy);}
function entryStatus(){const count=Object.keys(touched).length;$('enteredCount').textContent=`已輸入 ${count} / ${state.players.length}`;$('entryStatus').textContent=state.completedRound===state.totalRounds?'已結算 · 遊戲完成':`${count===state.players.length?'可結算':'待輸入'} · 未輸入的學生視為持有`;$('preview').disabled=busy||!online||state.completedRound===state.totalRounds;}
function selector(options,value,attribute,label){const select=el('select');select.setAttribute(attribute,'');select.setAttribute('aria-label',label);for(const [v,text]of Object.entries(options)){const option=el('option',text);option.value=v;select.append(option);}select.value=String(value);return select;}
function render(){
  $('setup').hidden=true;$('game').hidden=false;const final=state.completedRound===state.totalRounds;
  $('roundTitle').textContent=final?`已完成 ${state.totalRounds} 回合 · 最終收市`:`第 ${state.completedRound+1} / ${state.totalRounds} 回合 · 開市價`;
  pricesView($('prices'),state.prices);$('entryPanel').hidden=final;$('entryRows').replaceChildren();
  for(const p of state.players){
    const order=drafts[p.id]||{action:'hold',product:'blue',quantity:1};const row=el('tr');row.dataset.player=p.id;
    const label=el('td');label.append(el('strong',p.id+(p.name?' · '+p.name:'')),el('small',`現金 ${p.cash} 幣`));row.append(label);
    for(const select of [selector(actionNames,order.action,'data-action',p.id+' 決定'),selector(PRODUCTS,order.product||'blue','data-product',p.id+' 商品'),selector({1:'1',2:'2',3:'3'},order.quantity||1,'data-quantity',p.id+' 件數')]){const td=el('td');td.append(select);row.append(td);}
    row.append(el('td','','warning'));row.addEventListener('change',()=>changeDraft(p.id,row));$('entryRows').append(row);validateRow(p.id,row);
  }
  $('assets').replaceChildren();for(const p of state.players){const tr=el('tr');for(const value of [p.id+(p.name?' · '+p.name:''),p.cash,netWorth(p,state.prices),...Object.keys(PRODUCTS).map(k=>p.holdings[k])])tr.append(el('td',String(value)));$('assets').append(tr);}
  $('historyRound').replaceChildren();for(const h of state.history){const o=el('option',`第 ${h.round} 回合`);o.value=h.round;$('historyRound').append(o);}$('historyRound').value=state.completedRound;renderHistory();entryStatus();$('undo').disabled=busy||!online||!state.history.length;clearPreview();
}
function renderHistory(){const entry=state.history.find(h=>h.round===Number($('historyRound').value));$('history').replaceChildren();if(!entry){$('history').textContent='尚未結算。';return;}const prices=Object.keys(PRODUCTS).map(k=>`${PRODUCTS[k]} ${entry.openingPrices[k]} → ${entry.closingPrices[k]}`).join('　');$('history').append(el('p','開市 → 收市：'+prices));const list=el('ul');for(const r of entry.results){const o=r.order;list.append(el('li',`${r.id}：${actionNames[o.action]||'無效'}${o.action!=='hold'?' '+(PRODUCTS[o.product]||'')+' '+o.quantity+' 件':''}；${r.executed?'已執行，手續費 '+r.fee+' 幣':'拒絕：'+r.error}`));}$('history').append(list);
  const balances=state.history.find(h=>h.round===entry.round+1)?.beforePlayers||state.players;
  const table=el('table'),head=el('tr');for(const title of ['學生','現金','總資產','藍／金／紅持貨'])head.append(el('th',title));table.append(head);
  for(const p of balances){const row=el('tr');for(const value of [p.id,p.cash,netWorth(p,entry.closingPrices),Object.values(p.holdings).join(' / ')])row.append(el('td',String(value)));table.append(row);}
  const scroll=el('div',undefined,'table-scroll');scroll.append(table);$('history').append(scroll);
}
function publicLink(){const url=new URL('display.html',location.href);url.searchParams.set('session',session);return url.href;}
function renderPairing(){const url=publicLink();$('publicLink').value=url;$('openDisplay').href=url;$('qr').replaceChildren();const reachable=configured&&location.protocol==='https:'&&!['localhost','127.0.0.1'].includes(location.hostname)&&!/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(location.hostname);$('qrNotice').textContent=reachable?'公開畫面無須登入；教師控制權保留在此瀏覽器。':'本機預覽：這個網址未確認可供其他裝置存取，故不生成 QR。請使用已部署的 HTTPS 網址。';if(reachable){const qr=globalThis.qrcode(0,'M');qr.addData(url);qr.make();$('qr').innerHTML=qr.createSvgTag(4,4);}}
function attach(id){if(stop)stop();session=id;localStorage.setItem('trading-session',id);stop=connection.watch(id,data=>{
  const changed=revision!==data.revision;state=JSON.parse(data.privateState);revision=data.revision;
  if(changed){if(!busy&&Object.keys(touched).length)showMessage('另一個教師分頁已更新課堂。本分頁的未提交草稿已清空，請按最新回合重新檢查。');drafts={};touched={};try{const saved=JSON.parse(localStorage.getItem(draftKey())||'null');if(saved){drafts=saved.drafts;touched=saved.touched;}}catch{}render();renderPairing();}
},error=>{showMessage(Error('無法恢復此課堂：'+error.message+' 可在原本建立課堂的瀏覽器重開，或匯入備份建立新課堂。'));$('setup').hidden=false;});}
async function create(stateToCreate){if(!online){showMessage('尚未連線，請稍候再建立課堂。');return;}setBusy(true);showMessage('');try{const id=await connection.create(stateToCreate,publicSnapshot(stateToCreate));revision=0;attach(id);}catch(e){showMessage(e);}finally{setBusy(false);}}
async function commit(next){if(busy||!online)return;setBusy(true);showMessage('');try{await connection.commit(revision,next,publicSnapshot(next));}catch(e){showMessage(e);}finally{setBusy(false);if(state)entryStatus();}}
$('count').addEventListener('change',renderNames);function renderNames(){const previous=[...$('names').querySelectorAll('input')].map(n=>n.value);$('names').replaceChildren();for(let i=0;i<Number($('count').value);i++){const label=el('label',String(i+1).padStart(2,'0'));const input=el('input');input.maxLength=20;input.placeholder='只用編號即可';input.value=previous[i]||'';label.append(input);$('names').append(label);}}renderNames();
$('create').onclick=()=>create(createGame(Number($('count').value),Number($('rounds').value),[...$('names').querySelectorAll('input')].map(n=>n.value)));
$('joinDisplay').onclick=()=>{$('pairing').hidden=!$('pairing').hidden;};
$('copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(publicLink());$('copyLink').textContent='已複製連結';}catch{ $('publicLink').select();showMessage('請手動複製已選取的公開連結。');}};
$('preview').onclick=()=>{candidate=settle(state,drafts);const last=candidate.history.at(-1),invalid=last.results.filter(r=>!r.executed);$('previewSummary').textContent=`第 ${last.round} 回合：${last.results.filter(r=>r.executed&&r.order.action!=='hold').length} 筆買賣；${invalid.length} 筆被拒絕。${invalid.map(r=>r.id+'：'+r.error).join(' ')}${candidate.completedRound===candidate.totalRounds?' 這是最後收市，不會開始新一輪。':''}`;$('previewPrices').textContent=Object.keys(PRODUCTS).map(k=>`${PRODUCTS[k]}：${state.prices[k]} → ${candidate.prices[k]}`).join('　');$('previewPanel').hidden=false;$('previewPanel').scrollIntoView({behavior:'smooth',block:'center'});};
$('cancelPreview').onclick=clearPreview;$('confirm').onclick=()=>{if(candidate)commit(candidate);};
$('historyRound').onchange=renderHistory;
$('undo').onclick=()=>{if(!busy&&confirm('撤銷最近一輪？所有學生資產及 E-board 會回復到該輪交易前。之後請重新輸入整輪紙卡。'))commit(undo(state));};
$('newGame').onclick=()=>{if(confirm('建立另一課堂？現有課堂保留，但新課堂會有新的公開連結。')){$('game').hidden=true;$('setup').hidden=false;}};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=`秘密股票交易所-R${state.completedRound}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>500000)throw Error('備份檔案過大。');const imported=importGame(JSON.parse(await file.text()));await create(imported);}catch(e){showMessage(e);}finally{$('import').value='';}};
$('create').disabled=true;
try{connection=await hostConnection((text,connected)=>{online=connected;$('connection').textContent=text;$('connection').classList.toggle('offline',!connected);if(state)entryStatus();$('confirm').disabled=busy||!online;});$('create').disabled=false;const saved=localStorage.getItem('trading-session');if(saved)attach(saved);}catch(e){showMessage(e);$('connection').textContent='無法連線；請重新整理再試';}
