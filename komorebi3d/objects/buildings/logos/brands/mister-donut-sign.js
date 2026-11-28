import {paintImageFacade} from '../facade.js?v=shared-facade-priority-v1-20261128';
export function paintMisterDonutFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'misterDonut',backgroundColor:0xffffff,logoAspectRatio:1230/840});
}
