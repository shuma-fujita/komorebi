// Show the original complete wide artwork without cropping the edge waves.
import {paintImageFacade} from '../brand-facade.js?v=wall-inlay-step2-v1-20261124';
export const ISOMARU_BG=0xffffff;
export const ISOMARU_ASPECT=192/128;
export function paintIsomaruFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'isomaru',backgroundColor:ISOMARU_BG,logoAspectRatio:ISOMARU_ASPECT,
  backgroundUV:[.5,.5]
 });
}
