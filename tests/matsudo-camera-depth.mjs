import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matsudoCameraNear,MATSUDO_NEAR_MIN_M,MATSUDO_NEAR_MAX_M,MATSUDO_FAR_M}
 from '../komorebi3d/maps/matsudo-camera-depth.js';
const pose=(altitude,pitch=0,distance=12,lag=0,yaw=0)=>{
 const y=altitude+1.65+lag;
 return {eye:[Math.sin(yaw)*distance,y+Math.tan(pitch)*distance,Math.cos(yaw)*distance],target:[0,y,0]};
};
assert.equal(MATSUDO_FAR_M,2200);
assert.equal(matsudoCameraNear(null,100),.1);
assert.equal(matsudoCameraNear(pose(0),0),.1);
assert.equal(matsudoCameraNear(pose(15),15),.1);
assert.equal(matsudoCameraNear(pose(80),80),4);
assert.equal(matsudoCameraNear(pose(250),250),4,'Previous high-flight setting retained through 250m');
assert.equal(matsudoCameraNear(pose(350),350),5);
assert.equal(matsudoCameraNear(pose(450),450),6);
assert.equal(matsudoCameraNear(pose(500),500),6);
// High-altitude boost is limited by actual camera height, even when looking up.
assert.equal(matsudoCameraNear(pose(300,0,12,-80),300),4);
const tight=pose(500,0,12*11/19);
assert.ok(matsudoCameraNear(tight,500)<4,'Closest zoom still respects helicopter clearance');
assert.equal(matsudoCameraNear(pose(100,-70*Math.PI/180,12, -60),100),.1,
 'Low camera position while looking upward retains close-range projection');
let last=.1;
for(let altitude=0;altitude<=500;altitude++){
 const near=matsudoCameraNear(pose(altitude),altitude);
 assert.ok(near>=last&&near<=MATSUDO_NEAR_MAX_M,'Continuous monotonic altitude policy');
 assert.ok(near-last<=.061,'No abrupt switch across altitude thresholds');
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
     if(near>.1){
      const forward=p.target.map((v,i)=>v-p.eye[i]),len=Math.hypot(...forward);
      const center=[0,altitude+1.65,0];
      const depth=center.reduce((n,v,i)=>n+(v-p.eye[i])*forward[i]/len,0);
      assert.ok(near<=depth-3+1e-9,'Adaptive near plane clears full helicopter sphere plus margin');
     }
     checked++;
    }
// Approximate standard perspective depth step at 500m on a 24-bit buffer.
const step=(z,n,f)=>z*z*(f-n)/(f*n*(2**24-1));
assert.ok(step(500,4,2200)<step(500,.1,2200)/39,
 'Previous far-distance depth precision improves by about 40x at 4m near');
assert.ok(step(500,6,2200)<step(500,4,2200)*.67,
 'High-altitude boost gives about 1.5x the previous depth precision');
const dev=readFileSync('komorebi3d/dev.html','utf8');
assert.ok(dev.includes('near:matsudoCameraNear(pose,flightAltitude),far:MATSUDO_FAR_M'));
assert.ok(dev.includes('camera:{...camera,fovDegrees:45,near:.1,far:2200}'),'Editor projection unchanged');
assert.ok(dev.includes('camera:{eye:pose.eye,target:pose.target,fovDegrees:45,near:.1,far:220}'),'Forest projection unchanged');
assert.ok(dev.includes('facadeTextureLayers[screen].render(faces,snapshot.camera)'),'PNG wall layer shares snapshot near/far');
console.log('Matsudo camera depth PASS: '+checked+' orbit/altitude/zoom/lag combinations');
