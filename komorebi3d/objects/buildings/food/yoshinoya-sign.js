// Shared image facade; orange sampled from the user's artwork.
import {paintImageFacade} from '../brand-facade.js?v=shared-entrance-fascia-v1-20261123';
export const YOSHINOYA_BG=0xe08831;
export const YOSHINOYA_ASPECT=320/186;
export function paintYoshinoyaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'yoshinoya',backgroundColor:YOSHINOYA_BG,
  logoAspectRatio:YOSHINOYA_ASPECT
 });
}
