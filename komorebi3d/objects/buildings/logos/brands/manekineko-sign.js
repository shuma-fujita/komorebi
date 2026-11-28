import {paintImageFacade} from '../facade.js?v=shared-facade-priority-v1-20261128';
export function paintManekinekoFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'manekineko',backgroundColor:0xffffff,logoAspectRatio:600/260});
}
