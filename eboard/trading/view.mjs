export const products={blue:'藍水晶',gold:'黃金鐘',red:'紅藥水'};
export const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const svgNS = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes, text) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function priceChart(name, values, totalRounds) {
  const left = 40, right = 368, top = 18, bottom = 72;
  const x = round => left + round * (right - left) / totalRounds;
  const y = price => bottom - (price - 60) * (bottom - top) / 100;
  const svg = svgElement('svg', {
    viewBox: '0 0 380 100', class: 'price-chart', role: 'img',
    preserveAspectRatio: 'none',
    'aria-label': name + '折線圖，開始及各回合收市價：' + values.join('、') + ' 幣'
  });
  for (const price of [60, 100, 160]) {
    svg.append(svgElement('line', {x1:left, y1:y(price), x2:right, y2:y(price), class:'chart-grid'}));
    svg.append(svgElement('text', {x:left-8, y:y(price)+4, 'text-anchor':'end', class:'chart-axis'}, price));
  }
  svg.append(svgElement('line', {x1:left, y1:top, x2:left, y2:bottom, class:'chart-axis-line'}));
  for (let round = 0; round <= totalRounds; round++) {
    svg.append(svgElement('line', {x1:x(round), y1:bottom, x2:x(round), y2:bottom+4, class:'chart-axis-line'}));
    svg.append(svgElement('text', {x:x(round), y:92, 'text-anchor':'middle', class:'chart-axis'}, round === 0 ? '開始' : round));
  }
  svg.append(svgElement('polyline', {
    points: values.map((price, round) => `${x(round)},${y(price)}`).join(' '),
    fill:'none', stroke:'currentColor', 'stroke-width':2.5, 'stroke-linejoin':'round'
  }));
  values.forEach((price, round) => {
    const dot = svgElement('circle', {cx:x(round), cy:y(price), r:3.5, class:'chart-point'});
    dot.append(svgElement('title', {}, `${round === 0 ? '開始' : '第 '+round+' 回合收市'}：${price} 幣`));
    svg.append(dot);
    svg.append(svgElement('text', {x:x(round), y:y(price)-8, 'text-anchor':'middle', class:'chart-value'}, price));
  });
  return svg;
}
export function pricesView(target, prices, trends, totalRounds = 8) {
  target.replaceChildren();
  for (const [key, name] of Object.entries(products)) {
    const card = el('article', undefined, 'price-card ' + key);
    const heading = trends ? el('div', undefined, 'chart-heading') : card;
    heading.append(el('span', name), el('strong', String(prices[key])));
    if (trends) {
      card.append(heading, priceChart(name, Object.values(trends[key]), totalRounds));
    }
    target.append(card);
  }
}
export function showMessage(error) {const node=document.querySelector('#message');node.hidden=!error;node.textContent=error?.message||error||'';}
