// White wall around the user's square Bamiyan logo.
import {paintImageFacade} from '../brand-facade.js?v=occupancy-facade-modes-v1-20261123';
export const BAMIYAN_BG=0xffffff;
export function paintBamiyanFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'bamiyan',backgroundColor:BAMIYAN_BG
 });
}
