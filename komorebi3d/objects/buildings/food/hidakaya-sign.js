// Shared image facade; keep all non-logo walls white.
import {paintImageFacade} from '../brand-facade.js?v=wall-inlay-step2-v1-20261124';
export const HIDAKAYA_BG=0xffffff;
export const HIDAKAYA_ASPECT=588/128;
export function paintHidakayaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'hidakaya',backgroundColor:HIDAKAYA_BG,
  logoAspectRatio:HIDAKAYA_ASPECT,backgroundUV:[.94,.5]
 });
}
