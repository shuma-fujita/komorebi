// Identify restaurant POIs and map them to real OSM building footprints.
import {matchStoreBuildings} from '../store-matching.js?v=store-poi-brand-v1-20261122';
import {resolveImageBrandPaint} from '../store-levels.js?v=store-poi-level-v1-20261122';
import {resolveConveniencePaint} from '../convenience/osm-adapter.js?v=lawson-image-v1-20261123';
import {yoshinoya} from './yoshinoya.js?v=food-storefront-20261119';
import {hidakaya} from './hidakaya.js?v=food-storefront-20261119';
import {mcdonalds} from './mcdonalds.js?v=mcdonalds-poi-level-v2-20261122';
import {gusto} from './gusto.js?v=food-gusto-v1-20261122';
import {torikizoku} from './torikizoku.js?v=food-torikizoku-v1-20261122';
import {bamiyan} from './bamiyan.js?v=food-bamiyan-v1-20261122';
import {isomaru} from './isomaru.js?v=isomaru-wide-v1-20261122';
const brands=[yoshinoya,hidakaya,mcdonalds,gusto,torikizoku,bamiyan,isomaru];
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
function identifyFood(tags){
 const amenity=tags?.amenity;
 if(!['fast_food','restaurant','pub'].includes(amenity))return null;
 const names=[tags?.['brand:ja'],tags?.brand,tags?.['brand:en'],tags?.['name:ja'],tags?.name,tags?.['name:en']];
 // OSM maps Torikizoku as amenity=pub at Matsudo. Include that value
 // specifically for this izakaya, without changing the other food chains.
 if(amenity==='pub')
  return names.some(v=>{const n=normalize(v);return n&&torikizoku.names.some(alias=>n.startsWith(normalize(alias)));})
   ?torikizoku:null;
 if(tags?.['brand:wikidata']==='Q38076')return mcdonalds;
 return brands.find(brand=>names.some(v=>{const n=normalize(v);return n&&brand.names.some(alias=>n.startsWith(normalize(alias)));}))||null;
}
export function matchFoodBuildings(elements,project,halfSize){
 return matchStoreBuildings(elements,project,halfSize,identifyFood);
}
// Same physical floor-spanning rules and missing-level fallback as convenience.
export function resolveFoodPaint(stores,tags,height,inferredLevels=null){
 // Image-backed brands draw on UV wall faces rather than ordinary food stripes.
 const imageBrands=new Set(['mcdonalds','gusto','torikizoku','bamiyan','isomaru']);
 return resolveConveniencePaint(stores?.filter(s=>!imageBrands.has(s.brand?.id)),tags,height,inferredLevels);
}
// Use the same zero-based OSM 'level' interpretation as convenience stores.
// No hard-coded building IDs or floors. An absent/invalid level must not
// accidentally turn the ENTIRE tower into a McDonald's facade.
export function resolveMcDonaldsPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'mcdonalds');
}
export function resolveGustoPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'gusto');
}
export function resolveBamiyanPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'bamiyan');
}
export function resolveIsomaruPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'isomaru');
}
export function resolveTorikizokuPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'torikizoku');
}
