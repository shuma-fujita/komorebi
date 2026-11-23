// White wall / circular red logo: reuse the shared wall-aligned UV surface.
import {paintImageFacade} from '../brand-facade.js?v=frontage-bridge-v1-20261123';
export const GUSTO_BG=0xffffff;
export function paintGustoFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'gusto',backgroundColor:GUSTO_BG
 });
}
