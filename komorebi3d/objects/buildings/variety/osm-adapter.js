// DAISO / variety-store POI matching, using the same spatial and level
// conventions as the McDonald's food-brand pipeline.
import {matchStoreBuildings} from '../store-matching.js?v=store-poi-brand-v1-20261122';
import {resolveImageBrandPaint} from '../store-levels.js?v=store-poi-level-v1-20261122';
import {daiso} from './daiso.js?v=daiso-image-brand-20261122';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase()
 .replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
function identifyDaiso(tags){
 if(!tags?.shop||tags.shop==='no')return null;
 const names=[tags['brand:ja'],tags.brand,tags['brand:en'],
  tags['name:ja'],tags.name,tags['name:en']];
 return names.some(value=>{
  const n=normalize(value);
  return n&&daiso.names.some(alias=>n.startsWith(normalize(alias)));
 })?daiso:null;
}
export function matchDaisoBuildings(elements,project,halfSize){
 return matchStoreBuildings(elements,project,halfSize,identifyDaiso);
}
export function resolveDaisoPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'daiso');
}
