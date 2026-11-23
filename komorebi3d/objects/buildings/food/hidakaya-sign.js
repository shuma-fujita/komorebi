// Shared image facade; keep all non-logo walls white.
import {paintImageFacade} from '../brand-facade.js?v=shared-entrance-fascia-v1-20261123';
export const HIDAKAYA_BG=0xffffff;
export const HIDAKAYA_ASPECT=320/75;
export function paintHidakayaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'hidakaya',backgroundColor:HIDAKAYA_BG,
  logoAspectRatio:HIDAKAYA_ASPECT,backgroundUV:[.94,.5]
 });
}
