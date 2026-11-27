import {paintImageFacade} from '../facade.js?v=png-native-ratio-edge-v1-20261127';
export function paintSmbcFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'smbc',backgroundColor:0x005b41,backgroundUV:[.04,.96],logoAspectRatio:1422/678});
}
