// Single-site McDonald's second-floor facade for Matsudo station.
// Colored polygon artwork instead of external images or textures: both
// fixed A/B renderers support positions/normals/colors, but not image UVs.
// This changes neither OSM data nor any other McDonald's location.
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
// Two curved ribbons form the yellow M without relying on an external logo.
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
 if(!Array.isArray(polygon)||polygon.length<4||!Number.isFinite(height)||
  !Number.isFinite(levels)||levels<2||!polygon.every(p=>p.length===2&&p.every(Number.isFinite)))return false;
 const floor=height/levels;
 if(floor<1.5)return false;
 let twiceArea=0;
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length];
  twiceArea+=p[0]*q[1]-q[0]*p[1];
 }
 if(Math.abs(twiceArea)<.01)return false;
 const outward=Math.sign(twiceArea);
 const walls=polygon.map((a,i)=>{
  const b=polygon[(i+1)%polygon.length];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  return {a,dx,dz,length,i};
 }).filter(w=>w.length>.1);
 // Cover every edge of the second floor, including small setback edges.
 // Pick only four main walls for logos (longest faces if the OSM outline has
 // more than four segments), preventing repeated M logos around one corner.
 const logoWalls=[...walls].filter(w=>w.length>=1.2)
  .sort((a,b)=>b.length-a.length||a.i-b.i).slice(0,4);
 if(logoWalls.length!==4)return false;
 const place=(wall,u,y,offset)=>{
  const {a,dx,dz,length}=wall;
  return [a[0]+dx*u/length+outward*dz/length*offset,
   y,a[1]+dz*u/length-outward*dx/length*offset];
 };
 for(const wall of walls){
  quad(mesh,place(wall,0,floor,.07),place(wall,wall.length,floor,.07),
   place(wall,wall.length,2*floor,.07),place(wall,0,2*floor,.07),MC_SIGN_BG);
 }
 for(const wall of logoWalls){
  // Center the M in each main wall; shrink it automatically on short faces.
  const sx=Math.min(1.23,(wall.length-.3)/2.3);
  const sy=Math.min(.92,(floor-.25)/2.2);
  const imagePoint=(x,y)=>place(wall,wall.length/2+x*sx,1.5*floor+y*sy,.12);
  const logoQuad=(p0,p1,p2,p3,color)=>quad(mesh,
   imagePoint(p0[0],p0[1]),imagePoint(p1[0],p1[1]),
   imagePoint(p2[0],p2[1]),imagePoint(p3[0],p3[1]),color);
  goldenArch(logoQuad,[[-1,-.92],[-.84,1.46],[-.20,1.46],[0,-.86]]);
  goldenArch(logoQuad,[[0,-.86],[.20,1.46],[.84,1.46],[1,-.92]]);
 }
 return true;
}
