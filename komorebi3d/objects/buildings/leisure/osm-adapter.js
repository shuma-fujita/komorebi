// Shared OSM building association / zero-based tenant floors for Kaikatsu CLUB.
import {matchStoreBuildings} from '../store-matching.js?v=store-poi-brand-v1-20261122';
import {resolveImageBrandPaint} from '../store-levels.js?v=store-poi-level-v1-20261122';
import {kaikatsu} from './kaikatsu.js?v=kaikatsu-name-v1-20261122';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase()
 .replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
function identifyKaikatsu(tags){
 if(!tags?.amenity&&!tags?.shop&&!tags?.leisure)return null;
 const names=[tags['brand:ja'],tags.brand,tags['brand:en'],
  tags['name:ja'],tags.name,tags['name:en']];
 return names.some(value=>{
  const n=normalize(value);
  return n&&kaikatsu.names.some(alias=>n.startsWith(normalize(alias)));
 })?kaikatsu:null;
}
export function matchKaikatsuBuildings(elements,project,halfSize){
 return matchStoreBuildings(elements,project,halfSize,identifyKaikatsu);
}
export function resolveKaikatsuPaint(stores,tags,height,inferredLevels=null){
 return resolveImageBrandPaint(stores,tags,height,inferredLevels,'kaikatsu');
}
