// Shared PNG UV facade geometry for any named store. Only data-level
// geometry is generated here; the fixed Komorebi Engine is left untouched.
// Texture selection is handled by app-owned Renderer A/B facade layers.
import {paintConvenienceGlazing,entranceLogoSize,paintConvenienceFasciaDividers} from './convenience/common.js?v=occupancy-facade-modes-v1-20261123';
import {CONVENIENCE_DOOR_WIDTH_M} from './convenience/const.js?v=convenience-one-sign-v3-20261112';
import {getFacadeImageAspectRatio} from '../../maps/map-facade-textures.js?v=commons-three-v1-20261129';
import {selectLogoWalls,facadeRoadRank} from '../../maps/entrance-wall-selection.js?v=shared-facade-priority-v1-20261128';
// Step 2: opaque color and PNG logo occupy disjoint regions of ONE plane.
// Keep the existing logo plane (and existing glazing / fascia offsets).
const WALL_IMAGE_OFFSET_M=.012;
const WALL_COLOR_OFFSET_M=WALL_IMAGE_OFFSET_M;

// Horizontal density is independent of building height and floor count.
// Use the nominal full-size sign width and the existing wall-fit margin,
// not the occupied vertical span, to keep the selection stable across floors.
const MAX_UPPER_LOGO_HEIGHT_M=2.65;
const LOGO_WALL_MARGIN_M=.35;
const DENSE_LOGO_FRACTION=.8;
export function suppressDenseLogoWalls(polygon,indices,aspectRatio,assessment=null){
 const n=polygon.length;
 if(indices.length<2||!Number.isFinite(aspectRatio)||aspectRatio<=0)return indices.slice();
 const widths=polygon.map((p,i)=>Math.hypot(polygon[(i+1)%n][0]-p[0],polygon[(i+1)%n][1]-p[1]));
 const dense=new Set(indices.filter(i=>widths[i]>0&&
  Math.min(MAX_UPPER_LOGO_HEIGHT_M*aspectRatio,Math.max(0,widths[i]-LOGO_WALL_MARGIN_M))/widths[i]>=DENSE_LOGO_FRACTION));
 // Only contiguous dense selected walls compete. Separate or spacious
 // directions retain their signs. A chain of dense faces is one cluster.
 const ranks=new Map((assessment??[]).map(edge=>[edge.i,facadeRoadRank(edge)]));
 const visited=new Set(),removed=new Set();
 for(const i of dense){
  if(visited.has(i))continue;
  const cluster=[i];visited.add(i);
  for(let j=0;j<cluster.length;j++){
   const k=cluster[j];
   for(const neighbor of [(k+n-1)%n,(k+1)%n])
    if(dense.has(neighbor)&&!visited.has(neighbor)){visited.add(neighbor);cluster.push(neighbor);}
  }
  cluster.sort((a,b)=>(ranks.get(b)??0)-(ranks.get(a)??0)||widths[b]-widths[a]||a-b);
  for(const loser of cluster.slice(1))removed.add(loser);
 }
 return indices.filter(i=>!removed.has(i));
}

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

export function paintImageFacade(quad,mesh,polygon,{bottom,top,texturedFaces=null,ownerKey=null,texture,backgroundColor,drawFallbackLogo=null,logoAspectRatio=1,backgroundUV=[.04,.04],backgroundSample='corners',groundGlassTop=null,entranceEdgeIndex=null,logoOnGroundFasciaOnly=false,blockedWalls=null,logoWallIndices=null,facadeAssessment=null,sideBands=null,logoVerticalRange=null,bandsAcrossLogo=false}={}){
 if(!Array.isArray(polygon)||polygon.length<4||
  !Number.isFinite(bottom)||!Number.isFinite(top)||bottom<0||top-bottom<1.5||
  !polygon.every(p=>p.length===2&&p.every(Number.isFinite))||
  typeof texture!=='string'||!texture||!Array.isArray(backgroundUV)||backgroundUV.length!==2||backgroundUV.some(v=>!Number.isFinite(v)||v<0||v>1)||!Number.isFinite(logoAspectRatio)||logoAspectRatio<=0||!Number.isInteger(backgroundColor)||backgroundColor<0||backgroundColor>0xffffff)return false;
 // Use the actual decoded PNG ratio; retain the configured ratio only if the image could not load.
 if(Array.isArray(texturedFaces))logoAspectRatio=getFacadeImageAspectRatio(texture,logoAspectRatio);
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
 // The existing fascia height is fixed. Fit the image inside the full door-width area.
 const hasEntrance=isGroundOnly&&walls.some(w=>w.i===entranceEdgeIndex&&w.length>=CONVENIENCE_DOOR_WIDTH_M-1e-7&&!blockedWalls?.has(w.i));
 const logoAreaBottom=withGroundGlass?glassTop:bottom;
 let facadeLogoWalls=withGroundGlass&&Number.isInteger(entranceEdgeIndex)
  ?walls.filter(w=>w.i===entranceEdgeIndex)
  :logoOnGroundFasciaOnly&&withGroundGlass?[]:logoWalls;
 if(facadeMode==='upper-only'){
  const retained=new Set(suppressDenseLogoWalls(polygon,facadeLogoWalls.map(w=>w.i),logoAspectRatio,facadeAssessment));
  facadeLogoWalls=facadeLogoWalls.filter(w=>retained.has(w.i));
 }
 // Keep decorative bands at one absolute height on every eligible wall,
 // including walls without a logo. The entrance wall determines that height.
 const bandReference=facadeLogoWalls[0]??null;
 const referenceFasciaOnly=logoOnGroundFasciaOnly&&isGroundOnly;
 const referenceTop=referenceFasciaOnly?groundGlassTop:top;
 const referenceEntranceSize=isGroundOnly&&bandReference
  ?(hasEntrance&&bandReference.i===entranceEdgeIndex
   ?{height:Math.min(groundGlassTop-logoAreaBottom,CONVENIENCE_DOOR_WIDTH_M/logoAspectRatio)}
   :entranceLogoSize(bandReference.length,groundGlassTop-logoAreaBottom,logoAspectRatio,{fit:true}))
  :null;
 const referenceHeight=bandReference?(referenceEntranceSize
  ?referenceEntranceSize.height
  :Math.min(MAX_UPPER_LOGO_HEIGHT_M,referenceTop-logoAreaBottom-.28,
   (bandReference.length-LOGO_WALL_MARGIN_M)/logoAspectRatio)):0;
 const referenceBottom=withGroundGlass?logoAreaBottom:(logoAreaBottom+referenceTop-referenceHeight)/2;
 const bandHeight=withGroundGlass?groundGlassTop-logoAreaBottom:referenceHeight;
 const surface={texture,ownerKey,backgroundColor,backgroundUV,backgroundSample,logoAspectRatio,backgroundPositions:[],positions:[],uvs:[]};
 // Background color is geometry, never an image-covered wall.
 const place=(wall,u,y,offset)=>{
  const {a,dx,dz,length}=wall;
  return [a[0]+dx*u/length+outward*dz/length*offset,
   y,a[1]+dz*u/length-outward*dx/length*offset];
 };
 function face(w,u0,u1,y0,y1,uv0,uv1,uv2,uv3){
  if(u1<=u0||y1<=y0)return;
  const a=place(w,u0,y0,WALL_IMAGE_OFFSET_M),b=place(w,u1,y0,WALL_IMAGE_OFFSET_M);
  const c=place(w,u1,y1,WALL_IMAGE_OFFSET_M),d=place(w,u0,y1,WALL_IMAGE_OFFSET_M);
  texturedQuad(surface,a,b,c,d,uv0,uv1,uv2,uv3);
 }
 function solid(w,u0,u1,y0,y1){
  if(u1<=u0||y1<=y0)return;
  const a=place(w,u0,y0,WALL_COLOR_OFFSET_M),b=place(w,u1,y0,WALL_COLOR_OFFSET_M);
  const c=place(w,u1,y1,WALL_COLOR_OFFSET_M),d=place(w,u0,y1,WALL_COLOR_OFFSET_M);
  if(useTexture)surface.backgroundPositions.push(...a,...b,...c,...a,...c,...d);
  else quad(mesh,a,b,c,d,backgroundColor);
 }
 function paintBands(wall,left=0,right=0){
  if(!Array.isArray(sideBands)||!(bandHeight>0))return;
  for(const band of sideBands){
   if(!(band.from>=0&&band.to<=1&&band.to>band.from&&Number.isInteger(band.color)))continue;
   const y0=referenceBottom+bandHeight*band.from;
   const y1=referenceBottom+bandHeight*band.to;
   if(y0<logoAreaBottom-1e-7||y1>top+1e-7)continue;
   const stripe=(u0,u1)=>{
    if(u1<=u0)return;
    const depth=WALL_IMAGE_OFFSET_M+.004;
    quad(mesh,place(wall,u0,y0,depth),place(wall,u1,y0,depth),
     place(wall,u1,y1,depth),place(wall,u0,y1,depth),band.color);
   };
   if(bandsAcrossLogo)stripe(0,wall.length);
   else{stripe(0,left);stripe(right,wall.length);}
  }
 }
 for(const wall of walls){
  // For an obstructed ground-floor face, leave both glazing and the fascia
  // in the building's original wall material. Upper-storey branding remains.
  if(withGroundGlass&&blockedWalls?.has(wall.i)){
   if(top>groundGlassTop+1e-8)solid(wall,0,wall.length,groundGlassTop,top);
   continue;
  }
  const wallBottom=logoAreaBottom;
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
   solid(wall,0,wall.length,wallBottom,top);
   paintBands(wall,0,0);
   continue;
  }
  // Preserve original image aspect ratio; square brands retain exact dimensions.
  // Optional convenience-style placement keeps the image immediately above
  // the automatic door, inside the ground-floor fascia rather than the upper wall.
  const fasciaOnly=logoOnGroundFasciaOnly&&isGroundOnly;
  const imageAreaTop=fasciaOnly?groundGlassTop:top;
  // Restrict a sign image to its white center without moving the facade bands.
  const range=Array.isArray(logoVerticalRange)&&logoVerticalRange.length===2&&
   logoVerticalRange[0]>=0&&logoVerticalRange[1]<=1&&logoVerticalRange[1]>logoVerticalRange[0]
   ?logoVerticalRange:null;
  const imageBottomLimit=range&&withGroundGlass?logoAreaBottom+(groundGlassTop-logoAreaBottom)*range[0]:logoAreaBottom;
  const imageTopLimit=range&&withGroundGlass?logoAreaBottom+(groundGlassTop-logoAreaBottom)*range[1]:imageAreaTop;
  const availableImageHeight=imageTopLimit-imageBottomLimit;
  // Convenience-scale signs apply to ground-only occupancy; continuous
  // upper-storey branding restores the full-height logo above the door.
  const entranceSize=isGroundOnly
   ?(hasEntrance&&wall.i===entranceEdgeIndex?{height:Math.min(availableImageHeight,CONVENIENCE_DOOR_WIDTH_M/logoAspectRatio),width:Math.min(CONVENIENCE_DOOR_WIDTH_M,availableImageHeight*logoAspectRatio)}:entranceLogoSize(wall.length,availableImageHeight,logoAspectRatio,{fit:true}))
   :null;
  const imageHeight=entranceSize
   ?entranceSize.height
   :Math.min(MAX_UPPER_LOGO_HEIGHT_M,availableImageHeight-.28,(wall.length-LOGO_WALL_MARGIN_M)/logoAspectRatio);
  if(imageHeight<=0){solid(wall,0,wall.length,wallBottom,top);continue;}
  const imageWidth=entranceSize?entranceSize.width:imageHeight*logoAspectRatio;
  const left=(wall.length-imageWidth)/2,right=(wall.length+imageWidth)/2;
  const logoBottom=(imageBottomLimit+imageTopLimit)/2-imageHeight/2;
  const logoTop=(imageBottomLimit+imageTopLimit)/2+imageHeight/2;
  if(useTexture){
   // Four solid bands surround one inlaid PNG rectangle without overlap.
   // The same rectangle is rendered in solid color while its PNG is unavailable.
   solid(wall,0,left,wallBottom,top);
   solid(wall,right,wall.length,wallBottom,top);
   solid(wall,left,right,wallBottom,logoBottom);
   solid(wall,left,right,Math.max(wallBottom,logoTop),top);
   // Exterior-visible left/right depends on OSM footprint winding.
// Positive signed area: edge a->b runs visually right-to-left;
// negative signed area: edge a->b runs visually left-to-right.
// Preserve the original V direction (PNG uploads already flip image rows).
const uv=outward>0
 ? [[1,0],[0,0],[0,1],[1,1]]
 : [[0,0],[1,0],[1,1],[0,1]];
face(wall,left,right,logoBottom,logoTop,...uv);
   paintBands(wall,left,right);
  }else{
   solid(wall,0,wall.length,wallBottom,top);
   paintBands(wall,left,right);
   // Direct non-textured painter fallback. McDonald's supplies its classic
   // arch painter; DAISO keeps the solid pink facade if PNG is unavailable.
   if(typeof drawFallbackLogo==='function'){
    const imagePoint=(x,y)=>place(wall,wall.length/2+x*imageWidth/2.25,
     (logoAreaBottom+top)/2+y*imageHeight/3.1,WALL_IMAGE_OFFSET_M+.002);
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
