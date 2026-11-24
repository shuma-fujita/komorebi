import assert from 'node:assert/strict';
import {matsudoCameraNear,MATSUDO_NEAR_MIN_M,MATSUDO_NEAR_MAX_M,MATSUDO_FAR_M}
 from '../komorebi3d/maps/matsudo-camera-depth.js';
const pose=(altitude,pitch=0,distance=12,lag=0,yaw=0)=>{
 const y=altitude+1.65+lag;
 return {eye:[Math.sin(yaw)*distance,y+Math.tan(pitch)*distance,Math.cos(yaw)*distance],target:[0,y,0]};
};
assert.ok(MATSUDO_FAR_M>MATSUDO_NEAR_MAX_M);
let last=matsudoCameraNear(pose(0),0);
for(let altitude=1;altitude<=500;altitude++){
 const near=matsudoCameraNear(pose(altitude),altitude);
 assert.ok(Number.isFinite(near)&&near>=last&&near<=MATSUDO_NEAR_MAX_M);
 last=near;
}
// Use the real zoom limits, pitch range, and conservative helicopter sphere.
// Include lagging target height for climb/descent, and all orbit headings.
let checked=0;
for(const altitude of [0,15,20,50,80,150,250,350,450,500])
 for(const distance of [12*11/19,12,12*8.5/6.2])
  for(const degrees of [-70,-35,0,35,70,80])
   for(const lag of [-5,0,5])
    for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){
     const p=pose(altitude,degrees*Math.PI/180,distance,lag,yaw);
     const near=matsudoCameraNear(p,altitude);
     assert.ok(near>=MATSUDO_NEAR_MIN_M&&near<=MATSUDO_NEAR_MAX_M);
     if(near>MATSUDO_NEAR_MIN_M){
      const forward=p.target.map((v,i)=>v-p.eye[i]),len=Math.hypot(...forward);
      const center=[0,altitude+1.65,0];
      const depth=center.reduce((n,v,i)=>n+(v-p.eye[i])*forward[i]/len,0);
      assert.ok(near<=depth-3+1e-9,'Adaptive near plane clears full helicopter sphere plus margin');
     }
     checked++;
    }
console.log('Matsudo camera depth PASS: '+checked+' orbit/altitude/zoom/lag combinations');
