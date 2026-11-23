// Shared PNG UV facade geometry for any named store. Only data-level
// geometry is generated here; the fixed Komorebi Engine is left untouched.
// Texture selection is handled by app-owned Renderer A/B facade layers.
import {paintConvenienceGlazing,entranceLogoSize,paintConvenienceFasciaDividers} from './convenience/common.js?v=occupancy-facade-modes-v1-20261123';
import {selectLogoWalls} from '../../maps/entrance-wall-selection.js?v=frontage-connector-v2-20261123';
// Shared flush-mount facade: tiny depth bias avoids z-fighting with the original
// building wall. UV background and logo always occupy the same image plane.
const WALL_COLOR_OFFSET_M=.01;
const WALL_IMAGE_OFFSET_M=.012;

function texturedQuad(surface,a,b,c,d,ua,ub,uc,ud){
 for(const [p,uv] of [[a,ua],[b,ub],[c,uc],[a,ua],[c,uc],[d,ud]]){
  surface.positions.push(...p);
  surface.uvs.push(...uv);
 }
}
// A shared occupancy rule determines the facade, never a brand-name condition.
export function imageFacadeMode({bottom,top,groundGlassTop}={}){
 const ground=Number.isFinite(bottom)&&Number.isFinite(top)&&Number.isFinite(groundGlassTop)&&
  groundGlassTop>bottom+1e-8&&groundGlassTop<=top+1e-8;
 if(!ground)return 'upper-only';
 return top>groundGlassTop+1e-8?'ground-and-upper':'ground-only';
}

export function paintImageFacade(quad,mesh,polygon,{bottom,top,texturedFaces=null,ownerKey=null,texture,backgroundColor,drawFallbackLogo=null,logoAspectRatio=1,backgroundUV=[.04,.04],groundGlassTop=null,entranceEdgeIndex=null,logoOnGroundFasciaOnly=false,blockedWalls=null,logoWallIndices=null}={}){
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
 // The shared wall selector groups contiguous road frontages and excludes
 // obstructed faces. Call it here too for editor previews
 // and direct painters which do not receive the map's road-aware selection.
 const selectedIndices=Array.isArray(logoWallIndices)
  ?logoWallIndices:selectLogoWalls(polygon,[],[],blockedWalls);
 const allowedLogos=new Set(selectedIndices);
 const logoWalls=walls.filter(w=>allowedLogos.has(w.i));
 if(!walls.length)return false;
 const useTexture=Array.isArray(texturedFaces);
 const facadeMode=imageFacadeMode({bottom,top,groundGlassTop});
 const withGroundGlass=facadeMode!=='upper-only';
 const isGroundOnly=facadeMode==='ground-only';
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
 function face(w,u0,u1,y0,y1,uv0=backgroundUV,uv1=backgroundUV,uv2=backgroundUV,uv3=backgroundUV){
  if(u1<=u0||y1<=y0)return;
  const a=place(w,u0,y0,WALL_IMAGE_OFFSET_M),b=place(w,u1,y0,WALL_IMAGE_OFFSET_M);
  const c=place(w,u1,y1,WALL_IMAGE_OFFSET_M),d=place(w,u0,y1,WALL_IMAGE_OFFSET_M);
  texturedQuad(surface,a,b,c,d,uv0,uv1,uv2,uv3);
 }
 for(const wall of walls){
  // For an obstructed ground-floor face, leave both glazing and the fascia
  // in the building's original wall material. Upper-storey branding remains.
  if(withGroundGlass&&blockedWalls?.has(wall.i)){
   if(top>groundGlassTop+1e-8){
    quad(mesh,place(wall,0,groundGlassTop,WALL_COLOR_OFFSET_M),
     place(wall,wall.length,groundGlassTop,WALL_COLOR_OFFSET_M),
     place(wall,wall.length,top,WALL_COLOR_OFFSET_M),
     place(wall,0,top,WALL_COLOR_OFFSET_M),backgroundColor);
    if(useTexture)face(wall,0,wall.length,groundGlassTop,top);
   }
   continue;
  }
  // This base-colored quad is also the safe fallback while the PNG loads.
  const wallBottom=logoAreaBottom;
  if(top>wallBottom+1e-8)
   quad(mesh,place(wall,0,wallBottom,WALL_COLOR_OFFSET_M),place(wall,wall.length,wallBottom,WALL_COLOR_OFFSET_M),
    place(wall,wall.length,top,WALL_COLOR_OFFSET_M),place(wall,0,top,WALL_COLOR_OFFSET_M),backgroundColor);
  if(withGroundGlass&&!blockedWalls?.has(wall.i)){
   // Existing convenience glass panels, with exactly one entrance edge.
   const rect=(u0,u1,y0,y1,tint,offset=0)=>{
    if(u1<=u0||y1<=y0)return;
    quad(mesh,place(wall,u0,y0,.09+offset),place(wall,u1,y0,.09+offset),
     place(wall,u1,y1,.09+offset),place(wall,u0,y1,.09+offset),tint);
   };
   paintConvenienceGlazing(rect,{length:wall.length,bottom,top:glassTop,
    side:wall.i===entranceEdgeIndex?'front':'side',grayEntranceSeams:isGroundOnly});
   if(isGroundOnly&&wall.i===entranceEdgeIndex){
    // The glass-frame seam must continue through the fascia above the
    // automatic doors, just as it does on Seven-Eleven / FamilyMart.
    // Keep separators slightly ahead of the shared flush UV image layer.
    const fasciaRect=(u0,u1,y0,y1,tint,offset=0)=>{
     if(u1<=u0||y1<=y0)return;
     const depth=WALL_IMAGE_OFFSET_M+.002+offset;
     quad(mesh,place(wall,u0,y0,depth),place(wall,u1,y0,depth),
      place(wall,u1,y1,depth),place(wall,u0,y1,depth),tint);
    };
    paintConvenienceFasciaDividers(fasciaRect,{
     length:wall.length,bottom:glassTop,top:groundGlassTop,entrance:true
    });
   }
  }
  const isLogoWall=facadeLogoWalls.includes(wall);
  if(!isLogoWall){
   if(useTexture)face(wall,0,wall.length,wallBottom,top);
   continue;
  }
  // Preserve original image aspect ratio; square brands retain exact dimensions.
  // Optional convenience-style placement keeps the image immediately above
  // the automatic door, inside the ground-floor fascia rather than the upper wall.
  const fasciaOnly=logoOnGroundFasciaOnly&&isGroundOnly;
  const imageAreaTop=fasciaOnly?groundGlassTop:top;
  // Convenience-scale signs apply to ground-only occupancy; continuous
  // upper-storey branding restores the full-height logo above the door.
  const entranceSize=isGroundOnly
   ?entranceLogoSize(wall.length,groundGlassTop-logoAreaBottom,logoAspectRatio,{fit:true})
   :null;
  const imageHeight=entranceSize
   ?entranceSize.height
   :Math.min(2.65,imageAreaTop-logoAreaBottom-.28,(wall.length-.35)/logoAspectRatio);
  if(imageHeight<=0)continue;
  const imageWidth=entranceSize?entranceSize.width:imageHeight*logoAspectRatio;
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
face(wall,left,right,logoBottom,logoTop,...uv);
  }else{
   // Editor preview / PNG-load fallback. McDonald's supplies its classic
   // arch painter; DAISO keeps the solid pink facade if PNG is unavailable.
   if(typeof drawFallbackLogo==='function'){
    const imagePoint=(x,y)=>place(wall,wall.length/2+x*imageWidth/2.25,
     (logoAreaBottom+top)/2+y*imageHeight/3.1,WALL_IMAGE_OFFSET_M);
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
