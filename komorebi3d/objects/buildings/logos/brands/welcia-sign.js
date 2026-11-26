// Reuse the common image facade, including ground-floor glazing and wall inlays.
import {paintImageFacade} from '../facade.js?v=door-logo-4m-v1-20261127';
export const WELCIA_BG=0x012190;
export const WELCIA_ASPECT=1448/510;
export function paintWelciaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'welcia',backgroundColor:WELCIA_BG,logoAspectRatio:WELCIA_ASPECT});
}
