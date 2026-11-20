import assert from 'node:assert/strict';
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO,buildingPreviewCenterY}
 from '../komorebi3d/maps/building-editor-layout.js';
import {buildingEditorCamera} from '../komorebi3d/maps/building-editor-preview.js';

// The 3D camera must put the model's geometric center at the midpoint
// of the visible top strip, not at the old fixed 25%-of-canvas position.
const building={centerX:0,centerZ:0,width:12,depth:8,height:20};
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>a.map(n=>n/Math.hypot(...a));
function projectedCenterY(ratio,yaw,zoom){
 const {eye,target}=buildingEditorCamera(building,.75,{yaw,zoom},ratio);
 const forward=unit(sub(target,eye));
 const right=unit(cross(forward,[0,1,0]));
 const up=unit(cross(right,forward));
 const fromEye=sub([0,10,0],eye);
 const ndcY=dot(fromEye,up)/(dot(fromEye,forward)*Math.tan(Math.PI/8));
 return (1-ndcY)/2;
}
for(const ratio of [.3,.4,.5,.6]){
 assert.ok(Math.abs(buildingPreviewCenterY(ratio)-ratio/2)<1e-12);
 for(const yaw of [0,1.3,3.1])for(const zoom of [.8,1,1.8])
  assert.ok(Math.abs(projectedCenterY(ratio,yaw,zoom)-ratio/2)<1e-8,
   'model not centered: ratio='+ratio+', yaw='+yaw+', zoom='+zoom);
}
assert.equal(BUILDING_PREVIEW_RATIO+BUILDING_SHEET_RATIO,1);
console.log('building editor centered for 30:70, 40:60, 50:50, 60:40: PASS');
