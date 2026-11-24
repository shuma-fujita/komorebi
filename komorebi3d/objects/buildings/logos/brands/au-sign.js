import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintAuFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'au',backgroundColor:0xef5000,logoAspectRatio:892/508});
}
