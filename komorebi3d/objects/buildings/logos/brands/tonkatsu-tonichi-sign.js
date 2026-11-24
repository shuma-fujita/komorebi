// User-provided vertical yellow sign. Reuse shared UV facade and glazing.
import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export const TONKATSU_TONICHI_BG=0xfbf062;
export const TONKATSU_TONICHI_ASPECT=192/224;
export function paintTonkatsuTonichiFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'tonkatsuTonichi',backgroundColor:TONKATSU_TONICHI_BG,
  logoAspectRatio:TONKATSU_TONICHI_ASPECT
 });
}
