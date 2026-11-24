import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintDaikokuyaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'daikokuya',backgroundColor:0xff6d00,logoAspectRatio:775/228});
}
