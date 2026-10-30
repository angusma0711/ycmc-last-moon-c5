/* Original, seamless music-box and drone score; generated locally, no streaming. */
(function(root){
'use strict';
class MidnightAmbience {
 constructor(context){
  this.context=context;
  this.gain=context.createGain();this.gain.gain.value=0;this.gain.connect(context.destination);
  const rate=22050,seconds=32,buffer=context.createBuffer(1,rate*seconds,rate),samples=buffer.getChannelData(0);
  // Frequencies are whole cycles in 32 seconds so the drone loops without a click.
  const drones=[[73.40625,.15],[110,.065],[146.8125,.045],[155.5625,.025]];
  const notes=[293.6648,349.2282,440,311.1270,293.6648,220,233.0819,220];
  for(let i=0;i<samples.length;i++){
   const t=i/rate;let value=0;
   for(let j=0;j<drones.length;j++){
    const [frequency,amplitude]=drones[j];
    const breathing=.7+.3*Math.cos(2*Math.PI*(j+1)*t/32);
    value+=amplitude*breathing*Math.sin(2*Math.PI*frequency*t);
   }
   // A sparse minor-key music-box phrase, with tails wrapped across the seam.
   for(let n=0;n<notes.length;n++){
    const age=(t-n*4+seconds)%seconds;
    if(age<12){const attack=Math.min(1,age/.045),envelope=attack*Math.exp(-age/1.6);
     value+=.055*envelope*(Math.sin(2*Math.PI*notes[n]*age)+.22*Math.sin(2*Math.PI*notes[n]*2*age));}
   }
   samples[i]=value;
  }
  // Match the final sample to the first with a short crossfade for note tails.
  const fade=220;
  for(let i=0;i<fade;i++){const mix=i/(fade-1);samples[samples.length-fade+i]=samples[samples.length-fade+i]*(1-mix)+samples[0]*mix;}
  this.source=context.createBufferSource();this.source.buffer=buffer;this.source.loop=true;this.source.connect(this.gain);this.source.start();this.target=0;
 }
 setLevel(level){
  level=Math.max(0,Math.min(.45,Number(level)||0));if(Math.abs(level-this.target)<.00001)return;
  this.target=level;this.gain.gain.cancelScheduledValues(this.context.currentTime);
  this.gain.gain.setTargetAtTime(level,this.context.currentTime,level===0?.015:.18);
 }
}
root.MidnightAmbience=MidnightAmbience;
if(typeof module!=='undefined')module.exports=MidnightAmbience;
})(globalThis);
