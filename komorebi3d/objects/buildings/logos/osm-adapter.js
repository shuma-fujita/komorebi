// Unified brand-logo pipeline. OSM category is *not* the brand identity.
// A named POI may be a restaurant, pub, shop, office, leisure facility, etc.
import {LOGO_BRANDS} from './brands/index.js?v=logo-horizontal-density-v1-20261127';
import {matchLogoFootprints} from './matching.js?v=logos-unified-v1-20261122';
import {resolveLogoLevels} from './levels.js?v=shared-floor-20261126';
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase()
 .replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
const nameKeys=['brand:ja','brand','brand:en','name:ja','name','name:en'];
export function identifyLogoBrand(tags={}){
 // Distinctive brand identifier is safe even if a POI has no name or category.
 if(tags['brand:wikidata']==='Q38076')return LOGO_BRANDS.find(e=>e.brand.id==='mcdonalds')?.brand??null;
 const names=nameKeys.map(k=>normalize(tags[k])).filter(Boolean);
 // Brand=LAWSON is also used by variants: a named sub-brand takes precedence.
 const otherLawson=names.some(name=>['ローソンストア100','ローソン100','lawsonstore100','lawson100',
  'ナチュラルローソン','naturallawson'].some(prefix=>name.startsWith(normalize(prefix))));
 return LOGO_BRANDS.find(e=>e.brand.exactBrand!==undefined ? tags.brand===e.brand.exactBrand : (e.brand.id!=='lawson'||!otherLawson)&&
  (e.brand.id==='au' ? nameKeys.some(key=>{const value=String(tags[key]??'').normalize('NFKC').trim().toLowerCase();return /^au(?:$|[\s\-‐‑–—]|ショップ|style(?=$|[\s\-‐‑–—]|[^\x00-\x7f])|[^\x00-\x7f])/.test(value);}) : names.some(name=>e.brand.names.some(alias=>name.startsWith(normalize(alias))))))?.brand??null;
}
export function matchLogoBuildings(elements,project,halfSize){
 return matchLogoFootprints(elements,project,halfSize,identifyLogoBrand);
}
// Merge only touching floors of the same logo brand. Ground level belongs to
// the same group when it is contiguous with upper levels: no separate fascia.
// The existing image painter keeps its original maximum physical logo size.
export function contiguousLogoGroups(spans){
 const groups=[];
 for(const span of [...spans].sort((a,b)=>a.bottom-b.bottom||a.top-b.top)){
  const previous=groups.at(-1);
  if(previous&&span.bottom<=previous.top+1e-8)
   previous.top=Math.max(previous.top,span.top);
  else groups.push({...span});
 }
 return groups;
}
export function paintLogoBuilding(quad,mesh,polygon,stores,tags,height,inferredLevels,texturedFaces,ownerKey,occupied=[],entranceEdgeIndex=null,blockedWalls=null,logoWallIndices=null,paintedGroups=null){
 let count=0;
 for(const {brand,paint} of LOGO_BRANDS){
  // Preserve per-brand OSM validation and existing occupied-floor protection.
  const spans=resolveLogoLevels(stores,tags,height,inferredLevels,brand.id);
  for(const group of contiguousLogoGroups(spans)){
   if(occupied.some(other=>group.bottom<other.top-1e-8&&group.top>other.bottom+1e-8))continue;
   const ground=spans.find(span=>Math.abs(span.bottom)<1e-8);
   const groundGlassTop=group.bottom<1e-8&&ground?ground.top:null;
   if(paint(quad,mesh,polygon,{bottom:group.bottom,top:group.top,texturedFaces,ownerKey,
    groundGlassTop,entranceEdgeIndex,blockedWalls,logoWallIndices})){
    occupied.push(group);count++;
    // Report only successfully generated image facades, never speculative
    // occupancy or groups rejected by the painter / floor conflict check.
    paintedGroups?.push({bottom:group.bottom,top:group.top,groundGlassTop});
   }
  }
 }
 return count;
}
