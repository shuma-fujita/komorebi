// Safe floor-span resolver for image-backed stores. Uses existing zero-based
// OSM 'level' rules and never paints a whole building when level is missing.
import {resolveConveniencePaint} from './convenience/osm-adapter.js?v=ground-glass-centered-upper-v1-20261123';
export function resolveImageBrandPaint(stores,tags,height,inferredLevels=null,brandId){
 const matched=(stores||[]).filter(s=>s.brand?.id===brandId);
 if(!matched.length||'min_height' in tags||'building:min_level' in tags)return [];
 if(matched.some(s=>{
  const raw=String(s.level??'').trim();
  if(!/^\d+(?:\s*;\s*\d+)*$/.test(raw))return true;
  return raw.split(';').some(value=>!Number.isSafeInteger(Number(value)));
 }))return [];
 // Existing convenience-level utility owns the floor-height convention
 // (building:levels, height, or locally inferred tenant levels).
 const spans=resolveConveniencePaint(matched,tags,height,inferredLevels);
 if(!spans?.length)return [];
 // Invalid building metadata makes the shared utility fall back to an
 // all-building span. Never paint a whole multistorey tower on bad data.
 const count=Number(tags?.['building:levels']);
 const hasCount=Number.isSafeInteger(count)&&count>0;
 if(tags?.['building:levels']!==undefined&&!hasCount)return [];
 const explicitHeight=Number(tags?.height);
 const hasHeight=Number.isFinite(explicitHeight)&&explicitHeight>0;
 if(!hasCount&&!hasHeight&&!(Number.isSafeInteger(inferredLevels)&&inferredLevels>0))return [];
 if(hasCount&&matched.some(s=>s.level.split(';').some(v=>Number(v)>=count)))return [];
 if(spans.length===1&&spans[0].bottom===0&&spans[0].top===height&&
  matched.some(s=>!s.level.split(';').every(v=>Number(v)===0)))return [];
 return spans.filter(s=>s.brand?.id===brandId);
}
