// Orange facade matching the supplied white-on-orange Kaikatsu CLUB artwork.
import {paintImageFacade} from '../brand-facade.js?v=door-logo-4m-fixed-fascia-v2-20261127';
export const KAIKATSU_BG=0xec661b;
export function paintKaikatsuFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'kaikatsu',backgroundColor:KAIKATSU_BG
 });
}
