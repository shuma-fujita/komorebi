// McDonald's PNG UV facade. OSM POI name/brand and level determine placement.
// The existing yellow polygon M remains available for editor-preview fallback.
import {paintImageFacade} from '../brand-facade.js?v=logo-ground-glass-v1-20261123';
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
export function paintMcDonaldsFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'mcdonalds',backgroundColor:MC_SIGN_BG,
  drawFallbackLogo:logoQuad=>{
   goldenArch(logoQuad,[[-1,-.92],[-.84,1.46],[-.20,1.46],[0,-.86]]);
   goldenArch(logoQuad,[[0,-.86],[.20,1.46],[.84,1.46],[1,-.92]]);
  }
 });
}
