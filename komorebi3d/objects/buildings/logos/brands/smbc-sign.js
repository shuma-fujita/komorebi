import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export function paintSmbcFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'smbc',backgroundColor:0x005b41,backgroundUV:[.04,.96],logoAspectRatio:1422/678});
}
