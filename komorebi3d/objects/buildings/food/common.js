// Food-brand facade shares geometry, panel spacing, glass and entrance
// implementation with convenience stores, without classifying food as convenience.
import {paintConvenienceWall} from '../convenience/osm-adapter.js?v=lawson-storefront-20261119';
export function paintFoodWall(quad,mesh,a,b,height,baseColor,spans,side='side',outward=1){
 return paintConvenienceWall(quad,mesh,a,b,height,baseColor,spans,side,outward);
}
