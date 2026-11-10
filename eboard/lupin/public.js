(function(root){
'use strict';
const zones={A:'入口大堂',B:'古董展區',C:'寶石展區',D:'藝術展區',E:'保安室',F:'貨運出口'};
const text=(value,max=500)=>String(value??'').slice(0,max);
// Explicit whitelist: never spread a private game state into a cloud snapshot.
function fromPrivate(s){
 return {round:s.round,phase:s.phase,queries:s.queries,arrests:s.arrests,antiTheft:s.antiTheft,block:s.block,
  announcement:text(s.publicAnnouncement),outcome:s.result?{type:text(s.result.type,10),title:text(s.result.title,100),detail:text(s.result.detail)}:null};
}
function initial(){return {round:0,phase:'setup',queries:3,arrests:2,antiTheft:1,block:1,announcement:'尚未開始。',outcome:null};}
function map(){
 const p={A:[90,65],B:[300,65],C:[510,65],E:[90,250],D:[300,250],F:[510,250]},edges=[['A','B'],['A','E'],['B','C'],['B','D'],['C','D'],['D','E'],['D','F'],['E','F']];
 return '<svg class="map pubmap" viewBox="0 0 600 322" role="img" aria-label="博物館六區公開路線圖">'+edges.map(([a,b])=>`<line class="path" x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}"></line>`).join('')+Object.entries(p).map(([id,[x,y]])=>`<g class="zone ${id==='C'?'jewel':''} ${id==='A'||id==='F'?'exit':''}"><rect x="${x-67}" y="${y-35}" width="134" height="70"></rect><text x="${x}" y="${y-5}" font-weight="800" font-size="24">${id}</text><text x="${x}" y="${y+17}" font-size="12">${zones[id]}</text></g>`).join('')+'</svg>';
}
const api={zones,fromPrivate,initial,map};root.LupinPublic=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
