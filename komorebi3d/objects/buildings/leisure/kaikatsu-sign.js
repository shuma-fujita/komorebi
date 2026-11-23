// Orange facade matching the supplied white-on-orange Kaikatsu CLUB artwork.
import {paintImageFacade} from '../brand-facade.js?v=frontage-nearby-v1-20261123';
export const KAIKATSU_BG=0xec661b;
export function paintKaikatsuFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'kaikatsu',backgroundColor:KAIKATSU_BG
 });
}
