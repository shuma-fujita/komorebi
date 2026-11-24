// Outer image whitespace was cropped from the uploaded logo.
// Use its original solid yellow as the full wall's background color.
import {paintImageFacade} from '../brand-facade.js?v=wall-inlay-step2-v1-20261124';
export const TORIKIZOKU_BG=0xf5ca01;
export function paintTorikizokuFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'torikizoku',backgroundColor:TORIKIZOKU_BG
 });
}
