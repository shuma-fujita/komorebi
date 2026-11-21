import assert from 'node:assert/strict';
import {buildingEditorCamera} from '../komorebi3d/maps/building-editor-preview.js';
import {BUILDING_PREVIEW_RATIO} from '../komorebi3d/maps/building-editor-layout.js';

// A/B render to a 100%-high WebGL canvas, but only a slice above the
// editor sheet is visible. When Safari scrolls the normal-flow game panel,
// the building's image must move with that slice, without moving the canvas.
const building={centerX:0,centerZ:0,width:12,depth:8,height:34};
const center=[building.centerX,building.height/2,building.centerZ];
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const norm=x=>Math.hypot(...x);
function imageCenterY(camera){
 const forward=camera.target.map((v,i)=>v-camera.eye[i]);
 const fl=norm(forward);for(let i=0;i<3;i++)forward[i]/=fl;
 const right=[-forward[2],0,forward[0]];
 const rl=norm(right);for(let i=0;i<3;i++)right[i]/=rl;
 const up=[
  right[1]*forward[2]-right[2]*forward[1],
  right[2]*forward[0]-right[0]*forward[2],
  right[0]*forward[1]-right[1]*forward[0]
 ];
 const ray=center.map((v,i)=>v-camera.eye[i]);
 const fovHalf=Math.tan(45*Math.PI/360);
 return (1-dot(ray,up)/dot(ray,forward)/fovHalf)/2;
}
const near=(a,b,comment)=>assert.ok(Math.abs(a-b)<1e-9,comment+': '+a+' vs '+b);
// The WebGL canvas stays 100% high. A/B building framing is always in
// the upper 30% of that canvas, regardless of whether iOS shows a keyboard.
const original=buildingEditorCamera(building,.5,{yaw:0,zoom:1});
const explicit=buildingEditorCamera(building,.5,{yaw:0,zoom:1},BUILDING_PREVIEW_RATIO);
assert.deepEqual(original,explicit,'the default preview ratio stays at 30%');
near(imageCenterY(original),.15,'building center stays at 15% of full canvas');
for(const [yaw,zoom] of [[0,1],[.8,1],[1.5,1],[.3,.7],[2.6,2.2]]){
 const camera=buildingEditorCamera(building,.5,{yaw,zoom});
 near(imageCenterY(camera),.15,'3D preview is always framed in panel top 30%');
}
console.log('unchanged A/B 30%-of-canvas camera framing: PASS');
