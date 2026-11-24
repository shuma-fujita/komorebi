import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintMisterDonutFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'misterDonut',backgroundColor:0xffffff,logoAspectRatio:1230/840});
}
