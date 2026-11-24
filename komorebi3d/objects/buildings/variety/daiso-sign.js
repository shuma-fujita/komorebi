// Bright-pink DAISO PNG with white lettering, UV-mapped to the OSM shop level.
import {paintImageFacade} from '../brand-facade.js?v=wall-inlay-step2-v1-20261124';
export const DAISO_BG=0xf5008c;
export function paintDaisoFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'daiso',backgroundColor:DAISO_BG
 });
}
