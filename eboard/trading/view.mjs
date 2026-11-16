export const products={blue:'藍水晶',gold:'黃金鐘',red:'紅藥水'};
export const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
export function pricesView(target,prices,trends) {
  target.replaceChildren();
  for(const [key,name] of Object.entries(products)) {
    const card=el('article',undefined,'price-card '+key);
    card.append(el('span',name),el('strong',String(prices[key])));
    if(trends) {
      const values=Object.values(trends[key]);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 60');svg.setAttribute('role','img');svg.setAttribute('aria-label',name+'價格趨勢：'+values.join('、'));
      const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',values.map((v,i)=>`${10+i*300/Math.max(1,values.length-1)},${54-(v-60)*.48}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','3');svg.append(line);card.append(svg);
    }
    target.append(card);
  }
}
export function showMessage(error) {const node=document.querySelector('#message');node.hidden=!error;node.textContent=error?.message||error||'';}
