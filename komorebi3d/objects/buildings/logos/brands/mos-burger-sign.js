import {paintImageFacade} from '../facade.js?v=png-native-ratio-edge-v1-20261127';
export function paintMosBurgerFacade(quad,mesh,polygon,options={}){
 // The lower corners are red; sample the green upper margin instead.
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'mosBurger',backgroundColor:0x00a84d,backgroundUV:[.04,.96],logoAspectRatio:223/224});
}
