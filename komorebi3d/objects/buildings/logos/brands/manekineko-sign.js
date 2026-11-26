import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintManekinekoFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'manekineko',backgroundColor:0xffffff,logoAspectRatio:600/260});
}
