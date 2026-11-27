// User-provided Rakuten logo artwork, cropped around the wordmark.
// Reuse shared convenience glazing, entrance placement and UV facade geometry.
import {paintImageFacade} from '../facade.js?v=logo-horizontal-density-v1-20261127';
export const RAKUTEN_MOBILE_BG=0xe80288;
export const RAKUTEN_MOBILE_ASPECT=720/253;
export function paintRakutenMobileFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'rakutenMobile',backgroundColor:RAKUTEN_MOBILE_BG,
  logoAspectRatio:RAKUTEN_MOBILE_ASPECT,logoOnGroundFasciaOnly:true
 });
}
