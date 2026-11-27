import {paintImageFacade} from '../facade.js?v=logo-frontage-representatives-v1-20261127';
export function paintDaikokuyaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'daikokuya',backgroundColor:0xff6d00,logoAspectRatio:775/228});
}
