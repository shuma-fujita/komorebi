// Shared PNG UV facade geometry for any named store. Only data-level
// geometry is generated here; the fixed Komorebi Engine is left untouched.
// Texture selection is handled by app-owned Renderer A/B facade layers.
import {paintConvenienceGlazing} from './convenience/common.js?v=no-legacy-stripes-20261123';

function texturedQuad(surface,a,b,c,d,ua,ub,uc,ud){
 for(const [p,uv] of [[a,ua],[b,ub],[c,uc],[a,ua],[c,uc],[d,ud]]){
  surface.positions.push(...p);
  surface.uvs.push(...uv);
 }
}
export function paintImageFacade(quad,mesh,polygon,{bottom,top,texturedFaces=null,ownerKey=null,texture,backgroundColor,drawFallbackLogo=null,logoAspectRatio=1,backgroundUV=[.04,.04],groundGlassTop=null,entranceEdgeIndex=null,logoOnGroundFasciaOnly=false,blockedWalls=null}={}){
 if(!Array.isArray(polygon)||polygon.length<4||
  !Number.isFinite(bottom)||!Number.isFinite(top)||bottom<0||top-bottom<1.5||
  !polygon.every(p=>p.length===2&&p.every(Number.isFinite))||
  typeof texture!=='string'||!texture||!Array.isArray(backgroundUV)||backgroundUV.length!==2||backgroundUV.some(v=>!Number.isFinite(v)||v<0||v>1)||!Number.isFinite(logoAspectRatio)||logoAspectRatio<=0||!Number.isInteger(backgroundColor)||backgroundColor<0||backgroundColor>0xffffff)return false;
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
 // If OSM adds setback edges, keep the wall colored all around but place
 // exactly four centered logos on the four longest usable facades.
 const logoWalls=[...walls].filter(w=>w.length>=1.2)
  .sort((a,b)=>b.length-a.length||a.i-b.i).slice(0,4);
 if(logoWalls.length!==4)return false;
 const useTexture=Array.isArray(texturedFaces);
 const withGroundGlass=Number.isFinite(groundGlassTop)&&groundGlassTop>bottom+1e-8&&groundGlassTop<=top+1e-8;
 // A branded ground floor reserves its upper 20% as the fascia.
 // The glazing ends below it; logos occupy only fascia + contiguous upper walls.
 const glassTop=withGroundGlass?bottom+(groundGlassTop-bottom)*.8:bottom;
 const logoAreaBottom=withGroundGlass?glassTop:bottom;
 const facadeLogoWalls=withGroundGlass&&Number.isInteger(entranceEdgeIndex)
  ?walls.filter(w=>w.i===entranceEdgeIndex)
  :logoOnGroundFasciaOnly&&withGroundGlass?[]:logoWalls;
 const surface={texture,ownerKey,positions:[],uvs:[]};
 // Sample a uniform background pixel from each brand's own artwork.
 const place=(wall,u,y,offset)=>{
  const {a,dx,dz,length}=wall;
  return [a[0]+dx*u/length+outward*dz/length*offset,
   y,a[1]+dz*u/length-outward*dx/length*offset];
 };
 function face(w,u0,u1,y0,y1,uv0=backgroundUV,uv1=backgroundUV,uv2=backgroundUV,uv3=backgroundUV,offset=.075){
  if(u1<=u0||y1<=y0)return;
  const a=place(w,u0,y0,offset),b=place(w,u1,y0,offset);
  const c=place(w,u1,y1,offset),d=place(w,u0,y1,offset);
  texturedQuad(surface,a,b,c,d,uv0,uv1,uv2,uv3);
 }
 for(const wall of walls){
  // Obstruction affects only the glazed lower zone, not the upper fascia/logo.
  // This base-colored quad is also the safe fallback while the PNG loads.
  const wallBottom=logoAreaBottom;
  if(top>wallBottom+1e-8)
   quad(mesh,place(wall,0,wallBottom,.07),place(wall,wall.length,wallBottom,.07),
    place(wall,wall.length,top,.07),place(wall,0,top,.07),backgroundColor);
  if(withGroundGlass&&!blockedWalls?.has(wall.i)){
   // Existing convenience glass panels, with exactly one entrance edge.
   const rect=(u0,u1,y0,y1,tint,offset=0)=>{
    if(u1<=u0||y1<=y0)return;
    quad(mesh,place(wall,u0,y0,.09+offset),place(wall,u1,y0,.09+offset),
     place(wall,u1,y1,.09+offset),place(wall,u0,y1,.09+offset),tint);
   };
   paintConvenienceGlazing(rect,{length:wall.length,bottom,top:glassTop,
    side:wall.i===entranceEdgeIndex?'front':'side'});
  }
  const isLogoWall=facadeLogoWalls.includes(wall);
  if(!isLogoWall){
   if(useTexture)face(wall,0,wall.length,wallBottom,top);
   continue;
  }
  // Preserve original image aspect ratio; square brands retain exact dimensions.
  // Optional convenience-style placement keeps the image immediately above
  // the automatic door, inside the ground-floor fascia rather than the upper wall.
  const fasciaOnly=logoOnGroundFasciaOnly&&withGroundGlass;
  const imageAreaTop=fasciaOnly?groundGlassTop:top;
  const imageHeight=Math.min(2.65,imageAreaTop-logoAreaBottom-(fasciaOnly?.08:.28),
   (wall.length-.35)/logoAspectRatio);
  if(imageHeight<=0)continue;
  const imageWidth=imageHeight*logoAspectRatio;
  const left=(wall.length-imageWidth)/2,right=(wall.length+imageWidth)/2;
  const logoBottom=(logoAreaBottom+imageAreaTop)/2-imageHeight/2;
  const logoTop=(logoAreaBottom+imageAreaTop)/2+imageHeight/2;
  if(useTexture){
   // One continuous UV-mapped wall surface: background bands plus a square
   // logo, preserving image aspect ratio and each facade's center.
   face(wall,0,left,wallBottom,top);
   face(wall,right,wall.length,wallBottom,top);
   face(wall,left,right,wallBottom,logoBottom);
   face(wall,left,right,Math.max(wallBottom,logoTop),top);
   // Exterior-visible left/right depends on OSM footprint winding.
// Positive signed area: edge a->b runs visually right-to-left;
// negative signed area: edge a->b runs visually left-to-right.
// Preserve the original V direction (PNG uploads already flip image rows).
const uv=outward>0
 ? [[1,0],[0,0],[0,1],[1,1]]
 : [[0,0],[1,0],[1,1],[0,1]];
face(wall,left,right,logoBottom,logoTop,...uv,withGroundGlass?.14:.075);
  }else{
   // Editor preview / PNG-load fallback. McDonald's supplies its classic
   // arch painter; DAISO keeps the solid pink facade if PNG is unavailable.
   if(typeof drawFallbackLogo==='function'){
    const imagePoint=(x,y)=>place(wall,wall.length/2+x*imageWidth/2.25,
     (logoAreaBottom+top)/2+y*imageHeight/3.1,.12);
    const logoQuad=(p0,p1,p2,p3,color)=>quad(mesh,
     imagePoint(p0[0],p0[1]),imagePoint(p1[0],p1[1]),
     imagePoint(p2[0],p2[1]),imagePoint(p3[0],p3[1]),color);
    drawFallbackLogo(logoQuad);
   }
  }
 }
 if(useTexture)texturedFaces.push(surface);
 return true;
}
