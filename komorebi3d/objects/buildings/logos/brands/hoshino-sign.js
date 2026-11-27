// The white Hoshino Coffee mark on its coffee-brown facade, using common UV rules.
import {paintImageFacade} from '../facade.js?v=png-native-ratio-edge-v1-20261127';
export const HOSHINO_BG=0x522f19;
export const HOSHINO_ASPECT=288/192;
export function paintHoshinoFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{
  ...options,texture:'hoshino',backgroundColor:HOSHINO_BG,
  logoAspectRatio:HOSHINO_ASPECT
 });
}
