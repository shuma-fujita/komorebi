import {paintImageFacade} from '../facade.js?v=png-native-ratio-edge-v1-20261127';
export function paintDoutorFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'doutor',backgroundColor:0x000000,logoAspectRatio:692/193});
}
