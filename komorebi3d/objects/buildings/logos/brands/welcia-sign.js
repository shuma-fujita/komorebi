// Reuse the common image facade, including ground-floor glazing and wall inlays.
import {paintImageFacade} from '../facade.js?v=wall-inlay-step2-v1-20261124';
export const WELCIA_BG=0x012190;
export const WELCIA_ASPECT=1448/510;
export function paintWelciaFacade(quad,mesh,polygon,options={}){
 return paintImageFacade(quad,mesh,polygon,{...options,texture:'welcia',backgroundColor:WELCIA_BG,logoAspectRatio:WELCIA_ASPECT});
}
