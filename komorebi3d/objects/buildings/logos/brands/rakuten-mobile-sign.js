// User-provided Rakuten logo artwork, cropped to its pink rectangle.
// Reuse shared convenience glazing, entrance placement and UV facade geometry.
import {paintImageFacade} from '../facade.js?v=wall-occlusion-v1-20261123';
export const RAKUTEN_MOBILE_BG=0xe4007f;
export const RAKUTEN_MOBILE_ASPECT=256/95;
export function paintRakutenMobileFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'rakutenMobile',backgroundColor:RAKUTEN_MOBILE_BG,
  logoAspectRatio:RAKUTEN_MOBILE_ASPECT,logoOnGroundFasciaOnly:true
 });
}
