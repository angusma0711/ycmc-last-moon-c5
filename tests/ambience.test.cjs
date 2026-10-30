const {test}=require('node:test'),assert=require('node:assert/strict'),Ambience=require('../eboard/ambience.js');
test('original soundtrack loops with a continuous seam and bounded samples',()=>{
 let samples;const gain={value:0,cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}};
 const context={currentTime:1,destination:{},createGain:()=>({gain,connect(){}}),createBuffer(channels,length,rate){samples=new Float32Array(length);return {getChannelData:()=>samples,duration:length/rate};},createBufferSource:()=>({connect(){},start(){this.started=true;}})};
 const music=new Ambience(context);assert.equal(music.source.loop,true);assert.equal(music.source.started,true);assert.equal(music.source.buffer.duration,32);
 let energy=0,peak=0;for(const x of samples){assert(Number.isFinite(x));energy+=x*x;peak=Math.max(peak,Math.abs(x));}
 assert(energy/samples.length>.001);assert(peak<.5);assert(Math.abs(samples[0]-samples.at(-1))<.00001);
 music.setLevel(.05);assert.equal(music.target,.05);music.setLevel(0);assert.equal(music.target,0);
});
