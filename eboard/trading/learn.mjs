const $ = id => document.getElementById(id);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const icons = {
  wallet: '<rect x="6" y="12" width="52" height="36" rx="7"/><path d="M9 12V8h39v4M42 25h18v13H42z"/><circle cx="49" cy="31" r="1.5"/>',
  share: '<rect x="10" y="4" width="44" height="48" rx="4"/><path d="M20 23l12-10 12 10v13H20zM27 36V26h10v10M20 44h24"/>',
  coins: '<ellipse cx="25" cy="16" rx="17" ry="7"/><path d="M8 16v19c0 9 34 9 34 0V16M8 25c0 9 34 9 34 0"/><circle cx="46" cy="37" r="13"/>',
  paper: '<rect x="13" y="5" width="38" height="46" rx="4"/><path d="M21 17h22M21 27h22M21 37h12M43 47l14-14M39 51l4-4"/>'
};
function icon(kind) {
  const wrapper = node('span', undefined, 'concept-icon');
  wrapper.innerHTML = `<svg viewBox="0 0 64 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind]}</svg>`;
  return wrapper;
}
function tile(label, value, kind, className = '') {
  const card = node('div', undefined, 'number-tile ' + className);
  if (kind) card.append(icon(kind));
  card.append(node('span', label, 'tile-label'), node('strong', String(value), 'tile-value'));
  return card;
}
function equation(...terms) {
  const row = node('div', undefined, 'picture-equation');
  for (const term of terms) row.append(typeof term === 'string' ? node('span', term, 'math-sign') : term);
  return row;
}
function priceChoices() {
  const choices = node('div', undefined, 'price-choices');
  for (const [price, label, tone] of [[120, '↑ 120', 'up'], [80, '↓ 80', 'down']]) {
    const button = node('button', label, tone);
    button.type = 'button';
    button.setAttribute('aria-label', `選擇現價 ${price} 幣`);
    button.setAttribute('aria-pressed', String(currentPrice === price));
    button.onclick = () => { currentPrice = price; renderContent(); };
    choices.append(button);
  }
  return choices;
}
const slides = [
  {short:'公司', title:'股票＝公司的一小份', image:0,
    alt:'一間麵包店及代表麵包店擁有權的股份卡。', caption:'擁有 1 股，成為小股東。',
    draw() {
      const parts = node('div', undefined, 'ownership-parts');
      parts.setAttribute('role', 'img');
      parts.setAttribute('aria-label', '公司分為十等份，其中一份屬於你。');
      for (let i = 0; i < 10; i++) parts.append(node('span', i === 0 ? '你' : '', i === 0 ? 'owned' : ''));
      return [parts, equation(tile('整間公司', '10 份', 'share'), '→', tile('你擁有', '1 / 10', 'share', 'highlight'))];
    }},
  {short:'買入', title:'買入：錢換成股份', image:1,
    alt:'兩位模擬交易者交換金幣和股份卡，兩條箭嘴分別表示金錢及股份流向。', caption:'買入 1 股：100 幣 ＋ 5 幣手續費。',
    draw() {
      return [equation(tile('原有現金', '1,000', 'wallet'), '→', tile('餘下現金', '895', 'wallet'), '+', tile('持有股份', '1 股', 'share'))];
    }},
  {short:'升跌', title:'價格可以升，也可以跌', image:2,
    alt:'同一張股份卡旁有向上和向下的箭嘴，代表兩種可能。', caption:'消息、公司表現、大家的預期與買賣意願。',
    draw() {
      return [priceChoices(), equation(tile('買入價', '100', 'share'), '→', tile('現在價格', currentPrice, 'share', currentPrice > 100 ? 'up' : 'down')),
        node('p', '不保證賺錢', 'risk-note')];
    }},
  {short:'資產', title:'錢包 ＋ 股份市值＝總資產', image:3,
    alt:'錢包和股份卡放在同一個托盤上，兩者都是資產的一部分。', caption:'未賣出：錢包仍是 895 幣。',
    draw() {
      return [priceChoices(), equation(tile('現金', '895', 'wallet'), '+', tile('1 股 × 現價', currentPrice, 'share'), '=', tile('總資產', 895 + currentPrice, 'coins', 'highlight'))];
    }},
  {short:'賣出', title:'賣出：股份換回現金', image:4,
    alt:'股份卡轉給另一位交易者，金幣反方向交回；一枚金幣獨立放在旁邊代表費用。', caption:'賣出 1 股，再扣 5 幣手續費。',
    draw() {
      const proceeds = currentPrice - 5;
      return [priceChoices(), node('p', `賣價 ${currentPrice} − 費用 5 = 實收 ${proceeds}`, 'fee-formula'),
        equation(tile('原有現金', '895', 'wallet'), '+', tile('實收', proceeds, 'coins'), '=', tile('現在現金', 895 + proceeds, 'wallet', 'highlight')),
        node('p', '持股：0', 'zero-holding')];
    }},
  {short:'遊戲', title:'現在，換你作決定', image:5,
    alt:'藍水晶、黃金鐘、紅藥水與一張紙卡和鉛筆。', caption:'這三項是虛構商品，不是公司股份。',
    draw() {
      const decisions = node('div', undefined, 'decisions');
      for (const [label, symbol] of [['買入','＋'], ['賣出','−'], ['持有','＝']]) {
        const decision = node('div', undefined, 'decision');decision.append(node('strong', symbol), node('span', label));decisions.append(decision);
      }
      const rules = node('div', undefined, 'game-rules');
      rules.append(tile('每輪一個決定', '1 張', 'paper'), tile('買／賣數量', '1–3 件', 'share'));
      return [decisions, rules];
    }}
];
let slide = 0, currentPrice = 120;
const session = new URL(location.href).searchParams.get('session');
if (/^[a-f0-9]{32}$/.test(session || '')) {
  $('backToDisplay').href = 'display.html?session=' + session;
  $('backToDisplay').hidden = false;
}
for (const [index, item] of slides.entries()) {
  const button = node('button', undefined, 'chapter');
  button.type = 'button';button.append(node('span', String(index + 1)), node('span', item.short));
  button.setAttribute('aria-label', `第 ${index + 1} 張：${item.title}`);
  button.onclick = () => go(index, true);
  $('chapters').append(button);
}
function renderContent() {
  const item = slides[slide];
  $('visualExplanation').replaceChildren(...item.draw());
  $('slideCaption').textContent = item.caption;
  $('exampleNote').textContent = slide === 0 ? '股份是擁有權；紙卡只是圖像比喻。' : slide === 5 ? '遊戲另有價格規則，不用來預測真實股市。' : '虛構例子 • 每件 5 幣是遊戲費用，非真實收費。';
}
function go(index, focusHeading = false) {
  slide = Math.max(0, Math.min(slides.length - 1, index));
  const item = slides[slide];
  $('slideTitle').textContent = item.title;
  $('stepLabel').textContent = '圖 ' + (slide + 1) + ' / ' + slides.length;
  // Crop an 8px guard inside each 512px source panel to avoid adjacent-panel bleed.
  $('storyVisual').style.backgroundPosition = `${[0.76923077, 50, 99.23076923][item.image % 3]}% ${[1.51515152, 98.48484848][Math.floor(item.image / 3)]}%`;
  $('storyVisual').setAttribute('aria-label', item.alt);
  for (const [i, button] of [...$('chapters').children].entries()) {
    if (i === slide) button.setAttribute('aria-current', 'step');else button.removeAttribute('aria-current');
  }
  $('previous').disabled = slide === 0;
  $('next').disabled = slide === slides.length - 1;
  $('progress').textContent = `${slide + 1} / ${slides.length}`;
  renderContent();
  if (focusHeading) {
    $('slideTitle').focus({preventScroll:true});
    if (matchMedia('(max-width:999px)').matches) {
      window.scrollTo(0, 0);
      $('chapters').children[slide].scrollIntoView({block:'nearest', inline:'center'});
    }
  }
}
$('previous').onclick = () => go(slide - 1, true);
$('next').onclick = () => go(slide + 1, true);
document.addEventListener('keydown', event => {
  if ($('notes').open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('button, a, input, select, textarea')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();go(slide + (event.key === 'ArrowRight' ? 1 : -1), true);
  }
});
$('teacherNotes').onclick = () => $('notes').showModal();
$('closeNotes').onclick = () => $('notes').close();
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen();
  } catch { $('fullscreen').textContent = '請用瀏覽器全螢幕'; }
};
if (!document.documentElement.requestFullscreen) $('fullscreen').hidden = true;
go(0);
