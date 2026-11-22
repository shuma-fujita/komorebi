// Render a parking area using the map-builder's shared polygon triangulation
// and flat-quadrilateral geometry. No extra materials, draw calls or OSM fetches.
import {PARKING_ASPHALT_COLOR,PARKING_LINE_COLOR,PARKING_ASPHALT_Y,PARKING_LINE_Y,
 PARKING_LINE_WIDTH_M,PARKING_STALL_WIDTH_M,PARKING_STALL_DEPTH_M,
 PARKING_EDGE_INSET_M,PARKING_END_MARGIN_M} from './const.js';

function signedArea(points){
 let twice=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  twice+=a[0]*b[1]-b[0]*a[1];
 }
 return twice*.5;
}
function inside(point,polygon){
 const [x,z]=point;
 let within=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [ax,az]=polygon[j],[bx,bz]=polygon[i];
  const dx=bx-ax,dz=bz-az;
  const cross=dx*(z-az)-dz*(x-ax);
  if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7
   &&z>=Math.min(az,bz)-1e-7&&z<=Math.max(az,bz)+1e-7)return true;
  if((az>z)!==(bz>z)&&x<dx*(z-az)/(bz-az)+ax)within=!within;
 }
 return within;
}
function whollyInside(a,b,polygon){
 // Sample along each divider so a concave notch can't be crossed by endpoint checks alone.
 for(let k=0;k<=12;k++){
  const t=k/12;
  if(!inside([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],polygon))return false;
 }
 return true;
}
function paintDivider(mesh,a,b,quad){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 if(length<.01)return;
 const nx=-dz/length*PARKING_LINE_WIDTH_M*.5,nz=dx/length*PARKING_LINE_WIDTH_M*.5;
 quad(mesh,[a[0]-nx,PARKING_LINE_Y,a[1]-nz],[a[0]+nx,PARKING_LINE_Y,a[1]+nz],
  [b[0]+nx,PARKING_LINE_Y,b[1]+nz],[b[0]-nx,PARKING_LINE_Y,b[1]-nz],PARKING_LINE_COLOR);
}
export function paintParkingArea(mesh,polygon,top,quad){
 // The asphalt uses precisely the OSM footprint, including concave shapes.
 top(mesh,polygon,PARKING_ASPHALT_Y,PARKING_ASPHALT_COLOR);
 const orientation=Math.sign(signedArea(polygon));
 if(!orientation)return 0;
 let edgeIndex=-1,edgeLength=0;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length>edgeLength){edgeLength=length;edgeIndex=i;}
 }
 const bays=Math.floor((edgeLength-2*PARKING_END_MARGIN_M)/PARKING_STALL_WIDTH_M);
 if(bays<1)return 0;
 const a=polygon[edgeIndex],b=polygon[(edgeIndex+1)%polygon.length];
 const ux=(b[0]-a[0])/edgeLength,uz=(b[1]-a[1])/edgeLength;
 const ix=-uz*orientation,iz=ux*orientation;
 let drawn=0;
 for(let k=0;k<=bays;k++){
  const along=PARKING_END_MARGIN_M+k*PARKING_STALL_WIDTH_M;
  const root=[a[0]+ux*along+ix*PARKING_EDGE_INSET_M,
   a[1]+uz*along+iz*PARKING_EDGE_INSET_M];
  const tip=[root[0]+ix*PARKING_STALL_DEPTH_M,root[1]+iz*PARKING_STALL_DEPTH_M];
  if(!whollyInside(root,tip,polygon))continue;
  paintDivider(mesh,root,tip,quad);
  drawn++;
 }
 return drawn;
}
