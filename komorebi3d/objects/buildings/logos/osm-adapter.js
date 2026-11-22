// Unified brand-logo pipeline. OSM category is *not* the brand identity.
// A named POI may be a restaurant, pub, shop, office, leisure facility, etc.
import {LOGO_BRANDS} from './brands/index.js?v=isomaru-white-wall-v1-20261122';
import {matchLogoFootprints} from './matching.js?v=logos-unified-v1-20261122';
import {resolveLogoLevels} from './levels.js?v=logos-unified-v1-20261122';
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase()
 .replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
const nameKeys=['brand:ja','brand','brand:en','name:ja','name','name:en'];
export function identifyLogoBrand(tags={}){
 // Distinctive brand identifier is safe even if a POI has no name or category.
 if(tags['brand:wikidata']==='Q38076')return LOGO_BRANDS.find(e=>e.brand.id==='mcdonalds')?.brand??null;
 const names=nameKeys.map(k=>normalize(tags[k])).filter(Boolean);
 return LOGO_BRANDS.find(e=>names.some(name=>e.brand.names.some(alias=>name.startsWith(normalize(alias)))))?.brand??null;
}
export function matchLogoBuildings(elements,project,halfSize){
 return matchLogoFootprints(elements,project,halfSize,identifyLogoBrand);
}
export function paintLogoBuilding(quad,mesh,polygon,stores,tags,height,inferredLevels,texturedFaces,ownerKey,occupied=[]){
 let count=0;
 for(const {brand,paint} of LOGO_BRANDS){
  // Resolve brands independently; malformed metadata on one tenant cannot mask another.
  for(const span of resolveLogoLevels(stores,tags,height,inferredLevels,brand.id)){
   if(occupied.some(other=>span.bottom<other.top-1e-8&&span.top>other.bottom+1e-8))continue;
   if(paint(quad,mesh,polygon,{bottom:span.bottom,top:span.top,texturedFaces,ownerKey})){
    occupied.push(span);count++;
   }
  }
 }
 return count;
}
