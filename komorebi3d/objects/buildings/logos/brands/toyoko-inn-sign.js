import {paintImageFacade} from '../facade.js?v=toyoko-white-v2-20261128';
export function paintToyokoInnFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'toyokoInn',backgroundColor:0xffffff,backgroundSample:'fixed',logoAspectRatio:2172/650});
}
