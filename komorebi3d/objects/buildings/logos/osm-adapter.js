// Unified brand-logo pipeline. OSM category is *not* the brand identity.
// A named POI may be a restaurant, pub, shop, office, leisure facility, etc.
import {LOGO_BRANDS} from './brands/index.js?v=ground-glass-centered-upper-v1-20261123';
import {matchLogoFootprints} from './matching.js?v=ground-glass-centered-upper-v1-20261123';
import {resolveLogoLevels} from './levels.js?v=ground-glass-centered-upper-v1-20261123';
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
// One centered original-size logo per contiguous upper-floor group.
export function paintLogoBuilding(quad,mesh,polygon,stores,tags,height,inferredLevels,texturedFaces,ownerKey,occupied=[]){
 let count=0;
 for(const {brand,paint} of LOGO_BRANDS){
  const spans=resolveLogoLevels(stores,tags,height,inferredLevels,brand.id)
   .sort((a,b)=>a.bottom-b.bottom);
  const ground=spans.find(span=>span.bottom===0);
  if(ground&&!occupied.some(other=>ground.bottom<other.top-1e-8&&ground.top>other.bottom+1e-8)){
   const point=stores?.find(store=>store.brand?.id===brand.id&&
    String(store.level??'').split(';').map(Number).includes(0))?.point;
   if(paint(quad,mesh,polygon,{bottom:ground.bottom,top:ground.top,
    texturedFaces,ownerKey,storefront:true,entrancePoint:point})){
    occupied.push(ground);count++;
   }
  }
  const groups=[];
  for(const span of spans.filter(span=>span.bottom>=1e-8)){
   const last=groups.at(-1);
   if(last&&Math.abs(last.top-span.bottom)<1e-8)last.top=span.top;
   else groups.push({bottom:span.bottom,top:span.top});
  }
  for(const group of groups){
   if(occupied.some(other=>group.bottom<other.top-1e-8&&group.top>other.bottom+1e-8))continue;
   if(paint(quad,mesh,polygon,{bottom:group.bottom,top:group.top,
    texturedFaces,ownerKey})){
    occupied.push(group);count++;
   }
  }
 }
 return count;
}
