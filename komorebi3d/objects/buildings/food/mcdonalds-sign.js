// McDonald's PNG UV facade. Level/position/owner are decided by OSM POI
// matching and the shared food floor resolver, never hard-coded here.
// The fixed Engine receives ordinary red fallback polygons; A/B app texture
// layers draw the same PNG on wall-aligned zero-thickness UV triangles.
export const MC_SIGN_BG=0xdb0007;
export const MC_SIGN_GOLD=0xffcf16;
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
// A texture descriptor covers the selected OSM level's whole perimeter.
// Its logo sections use the full image UVs; every other section samples
// the PNG's solid-red corner. No protruding sign board is created.
function texturedQuad(surface,a,b,c,d,ua,ub,uc,ud){
 for(const [p,uv] of [[a,ua],[b,ub],[c,uc],[a,ua],[c,uc],[d,ud]]){
  surface.positions.push(...p);
  surface.uvs.push(...uv);
 }
}
export function paintMcDonaldsFacade(quad,mesh,polygon,{bottom,top,texturedFaces=null,ownerKey=null}={}){
 if(!Array.isArray(polygon)||polygon.length<4||
  !Number.isFinite(bottom)||!Number.isFinite(top)||bottom<0||top-bottom<1.5||
  !polygon.every(p=>p.length===2&&p.every(Number.isFinite)))return false;
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
 const surface={texture:'mcdonalds',ownerKey,positions:[],uvs:[]};
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
  quad(mesh,place(wall,0,bottom,.07),place(wall,wall.length,bottom,.07),
   place(wall,wall.length,top,.07),place(wall,0,top,.07),MC_SIGN_BG);
  const isLogoWall=logoWalls.includes(wall);
  if(!isLogoWall){
   if(useTexture)face(wall,0,wall.length,bottom,top);
   continue;
  }
  const size=Math.min(2.65,top-bottom-.28,wall.length-.35);
  const left=(wall.length-size)/2,right=(wall.length+size)/2;
  const logoBottom=(bottom+top)/2-size/2,logoTop=(bottom+top)/2+size/2;
  if(useTexture){
   // One continuous UV-mapped wall surface: red bands plus a square
   // logo, preserving image aspect ratio and each facade's center.
   face(wall,0,left,bottom,top);
   face(wall,right,wall.length,bottom,top);
   face(wall,left,right,bottom,logoBottom);
   face(wall,left,right,logoTop,top);
   face(wall,left,right,logoBottom,logoTop,[0,0],[1,0],[1,1],[0,1]);
  }else{
   // Legacy/editor preview compatibility without changing fixed Engine.
   const imagePoint=(x,y)=>place(wall,wall.length/2+x*size/2.25,
    (bottom+top)/2+y*size/3.1,.12);
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
