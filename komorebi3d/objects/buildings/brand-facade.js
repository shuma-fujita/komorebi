// Shared PNG UV facade geometry for any named store. Only data-level
// geometry is generated here; the fixed Komorebi Engine is left untouched.
// Texture selection is handled by app-owned Renderer A/B facade layers.
function texturedQuad(surface,a,b,c,d,ua,ub,uc,ud){
 for(const [p,uv] of [[a,ua],[b,ub],[c,uc],[a,ua],[c,uc],[d,ud]]){
  surface.positions.push(...p);
  surface.uvs.push(...uv);
 }
}
export function paintImageFacade(quad,mesh,polygon,{bottom,top,texturedFaces=null,ownerKey=null,texture,backgroundColor,drawFallbackLogo=null}={}){
 if(!Array.isArray(polygon)||polygon.length<4||
  !Number.isFinite(bottom)||!Number.isFinite(top)||bottom<0||top-bottom<1.5||
  !polygon.every(p=>p.length===2&&p.every(Number.isFinite))||
  typeof texture!=='string'||!texture||!Number.isInteger(backgroundColor)||backgroundColor<0||backgroundColor>0xffffff)return false;
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
 const surface={texture,ownerKey,positions:[],uvs:[]};
 const backgroundUV=[.04,.04]; // Solid background at the PNG corner.
 const place=(wall,u,y,offset)=>{
  const {a,dx,dz,length}=wall;
  return [a[0]+dx*u/length+outward*dz/length*offset,
   y,a[1]+dz*u/length-outward*dx/length*offset];
 };
 function face(w,u0,u1,y0,y1,uv0=backgroundUV,uv1=backgroundUV,uv2=backgroundUV,uv3=backgroundUV){
  const a=place(w,u0,y0,.075),b=place(w,u1,y0,.075);
  const c=place(w,u1,y1,.075),d=place(w,u0,y1,.075);
  texturedQuad(surface,a,b,c,d,uv0,uv1,uv2,uv3);
 }
 for(const wall of walls){
  // This base-colored quad is also the safe fallback while the PNG loads.
  quad(mesh,place(wall,0,bottom,.07),place(wall,wall.length,bottom,.07),
   place(wall,wall.length,top,.07),place(wall,0,top,.07),backgroundColor);
  const isLogoWall=logoWalls.includes(wall);
  if(!isLogoWall){
   if(useTexture)face(wall,0,wall.length,bottom,top);
   continue;
  }
  const size=Math.min(2.65,top-bottom-.28,wall.length-.35);
  const left=(wall.length-size)/2,right=(wall.length+size)/2;
  const logoBottom=(bottom+top)/2-size/2,logoTop=(bottom+top)/2+size/2;
  if(useTexture){
   // One continuous UV-mapped wall surface: background bands plus a square
   // logo, preserving image aspect ratio and each facade's center.
   face(wall,0,left,bottom,top);
   face(wall,right,wall.length,bottom,top);
   face(wall,left,right,bottom,logoBottom);
   face(wall,left,right,logoTop,top);
   // Wall edges follow the OSM footprint winding. Viewed from OUTSIDE,
// edge a->b is visually right-to-left, so invert U to keep text legible.
// V is unchanged (both A/B PNG uploads already flip image rows).
face(wall,left,right,logoBottom,logoTop,[1,0],[0,0],[0,1],[1,1]);
  }else{
   // Editor preview / PNG-load fallback. McDonald's supplies its classic
   // arch painter; DAISO keeps the solid pink facade if PNG is unavailable.
   if(typeof drawFallbackLogo==='function'){
    const imagePoint=(x,y)=>place(wall,wall.length/2+x*size/2.25,
     (bottom+top)/2+y*size/3.1,.12);
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
