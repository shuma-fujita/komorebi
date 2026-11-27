import {paintImageFacade} from '../facade.js?v=png-native-ratio-edge-v1-20261127';
export function paintMatsumotoKiyoshiFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'matsumotoKiyoshi',backgroundColor:0x003b80,backgroundSample:'edge'});
}
