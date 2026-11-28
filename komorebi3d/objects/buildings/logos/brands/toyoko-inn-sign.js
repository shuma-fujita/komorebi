import {paintImageFacade} from '../facade.js?v=toyoko-inn-v1-20261128';
export function paintToyokoInnFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'toyokoInn',backgroundColor:0x1746a2,backgroundSample:'edge',logoAspectRatio:2172/650});
}
