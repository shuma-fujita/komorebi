import assert from 'node:assert/strict';
import {buildingEditorCamera} from '../komorebi3d/maps/building-editor-preview.js';

const ratios=[.3,.4,.5,.6];
const buildings=[
 {centerX:0,centerZ:0,width:12,depth:8,height:20},
 {centerX:17,centerZ:-9,width:40,depth:30,height:10},
 {centerX:-40,centerZ:30,width:3,depth:3,height:70},
 {centerX:1,centerZ:1,width:25,depth:5,height:30}
];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[
 a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]
];
const normalize=v=>v.map(x=>x/Math.hypot(...v));
const t=Math.tan(45*Math.PI/360);

for(const ratio of ratios)for(const aspect of [.32,.55,1.2]){
 for(const building of buildings){
  let orbitDistance=null,nearestEdge=Infinity;
  for(let degree=0;degree<360;degree++){
   const {eye,target}=buildingEditorCamera(building,aspect,{yaw:degree*Math.PI/180},ratio);
   const forward=normalize(sub(target,eye));
   const right=normalize(cross(forward,[0,1,0]));
   const up=normalize(cross(right,forward));
   const distance=Math.hypot(...sub(target,eye));
   if(orbitDistance===null)orbitDistance=distance;
   else assert.ok(Math.abs(distance-orbitDistance)<1e-9,'orbit must not pump zoom');

   const center=[building.centerX,building.height/2,building.centerZ];
   const c=sub(center,eye);
   const cy=(1-dot(c,up)/(dot(c,forward)*t))/2;
   assert.ok(Math.abs(cy-ratio/2)<1e-9,'building center must stay at preview midpoint');

   for(const x of [-building.width/2,building.width/2])
    for(const y of [-building.height/2,building.height/2])
     for(const z of [-building.depth/2,building.depth/2]){
      const ray=sub([center[0]+x,center[1]+y,center[2]+z],eye);
      const depth=dot(ray,forward);
      assert.ok(depth>0,'corner must remain in front of camera');
      const nx=dot(ray,right)/(depth*t*aspect);
      const ny=dot(ray,up)/(depth*t);
      const leftRight=1-Math.abs(nx);
      const top=1-ny,bottom=ny-(1-2*ratio);
      assert.ok(leftRight>=-1e-8&&top>=-1e-8&&bottom>=-1e-8,
       'building clipped ratio='+ratio+' aspect='+aspect+' yaw='+degree);
      nearestEdge=Math.min(nearestEdge,leftRight,top,bottom);
     }
  }
  // At some orbit angle the bounding box should nearly touch a preview edge:
  // a larger default building would clip. This tests a tight *fixed* orbit fit.
  assert.ok(nearestEdge<.003,'unnecessary padding ratio='+ratio+' aspect='+aspect+
   ' nearest='+nearestEdge);
 }
}
console.log('building editor 30/40/50/60% tight full-orbit fit: PASS');
