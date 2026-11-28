import {paintImageFacade} from '../facade.js?v=commons-aspect-recovery-v1-20261129';
export function paintMisterDonutFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'misterDonut',backgroundColor:0xffffff,logoAspectRatio:1230/840});
}
