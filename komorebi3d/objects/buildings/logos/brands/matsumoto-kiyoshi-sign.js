import {paintImageFacade} from '../facade.js?v=door-logo-4m-fixed-fascia-v2-20261127';
export function paintMatsumotoKiyoshiFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'matsumotoKiyoshi',backgroundColor:0x003b80,logoAspectRatio:2});
}
