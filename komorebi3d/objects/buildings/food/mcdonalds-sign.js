// Single-site, two-storey wall-sign proof of concept for Matsudo station.
// Colored polygon artwork instead of a texture: both fixed A/B renderers
// support positions/normals/colors, but not image UVs in map mesh descriptors.
// This does not edit OSM data or affect any other McDonald's location.
export const MATSUDO_MCDONALDS_POI_ID=2992364618;
export const MATSUDO_MCDONALDS_BUILDING_ID=72709443;
export const MC_SIGN_BG=0xc8102e;
export const MC_SIGN_GOLD=0xffcf16;
export const MC_SIGN_WIDTH_M=3.6;
export const MC_SIGN_HEIGHT_M=2.25;

function pointInside(point,polygon){
 const [x,z]=point;
 let result=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [ax,az]=polygon[j],[bx,bz]=polygon[i];
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)result=!result;
 }
 return result;
}
export function findMatsudoMcDonaldsBuilding(elements,project){
 const store=elements.find(e=>e.type==='node'&&String(e.id)===String(MATSUDO_MCDONALDS_POI_ID)&&
  e.tags?.amenity==='fast_food'&&
  (e.tags['brand:wikidata']==='Q38076'||
   /(?:mcdonald|マクドナルド)/i.test(String(e.tags.brand||e.tags.name||''))));
 const building=elements.find(e=>e.type==='way'&&String(e.id)===String(MATSUDO_MCDONALDS_BUILDING_ID)&&
  e.tags?.building&&e.tags.building!=='no'&&e.geometry?.length>=4);
 if(!store||!building||!Number.isFinite(store.lat)||!Number.isFinite(store.lon))return null;
 const polygon=building.geometry.map(project);
 if(!polygon.every(p=>p.length===2&&p.every(Number.isFinite))||
    !pointInside(project(store),polygon))return null;
 return MATSUDO_MCDONALDS_BUILDING_ID;
}
const curve=(a,b,c,d,t)=>{
 const k=1-t;return k*k*k*a+3*k*k*t*b+3*k*t*t*c+t*t*t*d;
};
// Draw one golden arch as a smooth thick ribbon on a normalized 2D sign surface.
function goldenArch(quad,controls){
 let previous=null;
 for(let i=0;i<=18;i++){
  const t=i/18;
  const p=[
   curve(controls[0][0],controls[1][0],controls[2][0],controls[3][0],t),
   curve(controls[0][1],controls[1][1],controls[2][1],controls[3][1],t)];
  const a=Math.max(0,t-.002),b=Math.min(1,t+.002);
  const dx=curve(...controls.map(v=>v[0]),b)-curve(...controls.map(v=>v[0]),a);
  const dy=curve(...controls.map(v=>v[1]),b)-curve(...controls.map(v=>v[1]),a);
  const len=Math.hypot(dx,dy)||1,width=.095;
  const normal=[-dy/len*width,dx/len*width];
  const left=[p[0]+normal[0],p[1]+normal[1]];
  const right=[p[0]-normal[0],p[1]-normal[1]];
  if(previous)quad(previous.left,previous.right,right,left,MC_SIGN_GOLD);
  previous={left,right};
 }
}
export function paintMatsudoMcDonaldsSign(quad,mesh,polygon,height,{levels=9}={}){
 if(!Array.isArray(polygon)||polygon.length<3||!Number.isFinite(height)||
  !Number.isFinite(levels)||levels<2)return false;
 const floor=height/levels;
 if(floor<MC_SIGN_HEIGHT_M+.28)return false;
 // Station-facing facade: for PIAZA Matsudo the north-most wall faces JR Matsudo.
 let wall=null;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  if(length<MC_SIGN_WIDTH_M+1.5)continue;
  const midpointZ=(a[1]+b[1])/2;
  if(!wall||midpointZ<wall.midpointZ)wall={a,dx,dz,length,midpointZ};
 }
 if(!wall)return false;
 let twiceArea=0;
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length];
  twiceArea+=p[0]*q[1]-q[0]*p[1];
 }
 if(Math.abs(twiceArea)<.01)return false;
 const outward=Math.sign(twiceArea),{a,dx,dz,length}=wall;
 const h=MC_SIGN_HEIGHT_M,w=MC_SIGN_WIDTH_M;
 const y0=floor+(floor-h)/2;
 const place=(u,y,offset)=>[a[0]+dx*u/length+outward*dz/length*offset,
  y,a[1]+dz*u/length-outward*dx/length*offset];
 const imagePoint=(x,y,offset)=>place((length-w)/2+w/2+x*1.23,y0+h/2+y*.92,offset);
 // Red panel stands 7 cm clear of the facade.
 const left=(length-w)/2,right=(length+w)/2;
 quad(mesh,place(left,y0,.07),place(right,y0,.07),
  place(right,y0+h,.07),place(left,y0+h,.07),MC_SIGN_BG);
 const logoQuad=(p0,p1,p2,p3,color)=>quad(mesh,
  imagePoint(p0[0],p0[1],.12),imagePoint(p1[0],p1[1],.12),
  imagePoint(p2[0],p2[1],.12),imagePoint(p3[0],p3[1],.12),color);
 // Twin arches create the recognizable McDonald's M, with no text glyphs.
 goldenArch(logoQuad,[[-1,-.92],[-.84,1.46],[-.20,1.46],[0,-.86]]);
 goldenArch(logoQuad,[[0,-.86],[.20,1.46],[.84,1.46],[1,-.92]]);
 return true;
}
