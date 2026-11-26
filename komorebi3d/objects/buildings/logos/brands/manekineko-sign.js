import {paintImageFacade} from '../facade.js?v=door-logo-4m-v1-20261127';
export function paintManekinekoFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'manekineko',backgroundColor:0xffffff,logoAspectRatio:600/260});
}
