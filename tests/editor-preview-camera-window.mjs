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
const original=buildingEditorCamera(building,.5,{yaw:0,zoom:1});
const explicitOriginal=buildingEditorCamera(building,.5,{yaw:0,zoom:1},BUILDING_PREVIEW_RATIO,0);
assert.deepEqual(original,explicitOriginal,'original 30% framing must not change');
near(imageCenterY(original),.15,'unscrolled game preview centers at 15% canvas height');
for(const [start,ratio] of [[.25,.3],[.4,.3],[.65,.3],[.45,.15]]){
 const shifted=buildingEditorCamera(building,.5,{yaw:0,zoom:1},ratio,start);
 near(imageCenterY(shifted),start+ratio/2,'building centers in panel visible slice');
}
console.log('A/B camera visible-slice framing: PASS');
