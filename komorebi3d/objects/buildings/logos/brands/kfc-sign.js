import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintKfcFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'kfc',backgroundColor:0xb70218,backgroundUV:[.55,.8],logoAspectRatio:1979/794});
}
