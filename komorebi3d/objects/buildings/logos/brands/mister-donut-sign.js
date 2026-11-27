import {paintImageFacade} from '../facade.js?v=logo-frontage-representatives-v1-20261127';
export function paintMisterDonutFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'misterDonut',backgroundColor:0xffffff,logoAspectRatio:1230/840});
}
