import {paintImageFacade} from '../facade.js?v=logo-one-per-direction-v1-20261127';
export function paintAuFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'au',backgroundColor:0xef5000,logoAspectRatio:892/508});
}
