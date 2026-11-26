import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintMatsumotoKiyoshiFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'matsumotoKiyoshi',backgroundColor:0x003b80,logoAspectRatio:2});
}
