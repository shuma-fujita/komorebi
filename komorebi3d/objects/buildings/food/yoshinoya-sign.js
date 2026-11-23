// Shared image facade; orange sampled from the user's artwork.
import {paintImageFacade} from '../brand-facade.js?v=frontage-bridge-v1-20261123';
export const YOSHINOYA_BG=0xe08831;
export const YOSHINOYA_ASPECT=646/320;
export function paintYoshinoyaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'yoshinoya',backgroundColor:YOSHINOYA_BG,
  // The new art has a white stripe along its bottom edge. Background UV
  // must sample the solid orange upper area, not the white bottom corner.
  logoAspectRatio:YOSHINOYA_ASPECT,backgroundUV:[.04,.75]
 });
}
