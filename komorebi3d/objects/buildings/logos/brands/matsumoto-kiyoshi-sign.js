import {paintImageFacade} from '../facade.js?v=shared-facade-priority-v1-20261128';
export function paintMatsumotoKiyoshiFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'matsumotoKiyoshi',backgroundColor:0x003b80,backgroundSample:'edge'});
}
