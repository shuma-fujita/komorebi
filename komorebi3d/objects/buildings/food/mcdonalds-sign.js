// Single-site McDonald's second-floor facade for Matsudo station.
// Colored polygon artwork instead of external images or textures: both
// fixed A/B renderers support positions/normals/colors, but not image UVs.
// This changes neither OSM data nor any other McDonald's location.
export const MATSUDO_MCDONALDS_POI_ID=2992364618;
export const MATSUDO_MCDONALDS_BUILDING_ID=72709443;
export const MC_SIGN_BG=0xdb0007;
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
// A single texture descriptor covers the whole second-floor perimeter.
// Its logo sections use the full image UVs; every other section samples
// the PNG's solid-red corner. No protruding sign board is created.
function texturedQuad(surface,a,b,c,d,ua,ub,uc,ud){
 for(const [p,uv] of [[a,ua],[b,ub],[c,uc],[a,ua],[c,uc],[d,ud]]){
  surface.positions.push(...p);
  surface.uvs.push(...uv);
 }
}
export function paintMatsudoMcDonaldsSign(quad,mesh,polygon,height,{levels=9,texturedFaces=null}={}){
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
 // If OSM adds setback edges, keep the wall red all around but place
 // exactly four centered logos on the four longest usable facades.
 const logoWalls=[...walls].filter(w=>w.length>=1.2)
  .sort((a,b)=>b.length-a.length||a.i-b.i).slice(0,4);
 if(logoWalls.length!==4)return false;
 const useTexture=Array.isArray(texturedFaces);
 const surface={texture:'mcdonalds',positions:[],uvs:[]};
 const red=[.04,.04]; // PNG corner: flat red, away from the yellow M.
 const place=(wall,u,y,offset)=>{
  const {a,dx,dz,length}=wall;
  return [a[0]+dx*u/length+outward*dz/length*offset,
   y,a[1]+dz*u/length-outward*dx/length*offset];
 };
 function face(w,u0,u1,y0,y1,uv0=red,uv1=red,uv2=red,uv3=red){
  const a=place(w,u0,y0,.075),b=place(w,u1,y0,.075);
  const c=place(w,u1,y1,.075),d=place(w,u0,y1,.075);
  texturedQuad(surface,a,b,c,d,uv0,uv1,uv2,uv3);
 }
 for(const wall of walls){
  // The red polygon is also the safe fallback while the PNG loads.
  quad(mesh,place(wall,0,floor,.07),place(wall,wall.length,floor,.07),
   place(wall,wall.length,2*floor,.07),place(wall,0,2*floor,.07),MC_SIGN_BG);
  const isLogoWall=logoWalls.includes(wall);
  if(!isLogoWall){
   if(useTexture)face(wall,0,wall.length,floor,2*floor);
   continue;
  }
  const size=Math.min(2.65,floor-.28,wall.length-.35);
  const left=(wall.length-size)/2,right=(wall.length+size)/2;
  const bottom=1.5*floor-size/2,top=1.5*floor+size/2;
  if(useTexture){
   // One continuous UV-mapped wall surface: red bands plus a square
   // logo, preserving image aspect ratio and each facade's center.
   face(wall,0,left,floor,2*floor);
   face(wall,right,wall.length,floor,2*floor);
   face(wall,left,right,floor,bottom);
   face(wall,left,right,top,2*floor);
   face(wall,left,right,bottom,top,[0,0],[1,0],[1,1],[0,1]);
  }else{
   // Legacy/editor preview compatibility without changing fixed Engine.
   const imagePoint=(x,y)=>place(wall,wall.length/2+x*size/2.25,
    1.5*floor+y*size/2.1,.12);
   const logoQuad=(p0,p1,p2,p3,color)=>quad(mesh,
    imagePoint(p0[0],p0[1]),imagePoint(p1[0],p1[1]),
    imagePoint(p2[0],p2[1]),imagePoint(p3[0],p3[1]),color);
   goldenArch(logoQuad,[[-1,-.92],[-.84,1.46],[-.20,1.46],[0,-.86]]);
   goldenArch(logoQuad,[[0,-.86],[.20,1.46],[.84,1.46],[1,-.92]]);
  }
 }
 if(useTexture)texturedFaces.push(surface);
 return true;
}
