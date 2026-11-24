// White wall around the user's square Bamiyan logo.
import {paintImageFacade} from '../brand-facade.js?v=wall-inlay-step2-v1-20261124';
export const BAMIYAN_BG=0xffffff;
export function paintBamiyanFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'bamiyan',backgroundColor:BAMIYAN_BG
 });
}
