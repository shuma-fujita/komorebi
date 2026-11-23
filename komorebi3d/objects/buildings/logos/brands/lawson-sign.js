// LAWSON STATION artwork supplied by the user, with a Lawson-blue wall.
// The same shared image facade supplies first-floor glass and automatic doors.
import {paintImageFacade} from '../facade.js?v=shared-entrance-fascia-v1-20261123';
export const LAWSON_BG=0x0074bf;
export function paintLawsonFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'lawson',backgroundColor:LAWSON_BG
 });
}
