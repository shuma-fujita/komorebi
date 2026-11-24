// LAWSON STATION artwork supplied by the user, with a Lawson-blue wall.
// The same shared image facade supplies first-floor glass and automatic doors.
import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export const LAWSON_BG=0x0074bf;
export function paintLawsonFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'lawson',backgroundColor:LAWSON_BG
 });
}
