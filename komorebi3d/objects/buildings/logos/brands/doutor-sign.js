import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintDoutorFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'doutor',backgroundColor:0x000000,logoAspectRatio:664/177});
}
