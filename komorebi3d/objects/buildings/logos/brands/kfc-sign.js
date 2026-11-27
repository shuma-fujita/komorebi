import {paintImageFacade} from '../facade.js?v=png-native-ratio-edge-v1-20261127';
export function paintKfcFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'kfc',backgroundColor:0xb70218,backgroundUV:[.55,.8],logoAspectRatio:1979/794});
}
