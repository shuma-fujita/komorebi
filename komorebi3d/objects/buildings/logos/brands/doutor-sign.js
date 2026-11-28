import {paintImageFacade} from '../facade.js?v=shared-facade-priority-v1-20261128';
export function paintDoutorFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'doutor',backgroundColor:0x000000,logoAspectRatio:692/193});
}
