import {normalizeDrawingLevel} from '../../maps/osm-level-format.js?v=level-format-v1-20261124';
// One floor-span policy for legacy storefronts and image-backed brands.
// Never infer occupancy from a missing level or fall back to the whole wall.
function positive(raw){
 if(raw===undefined||raw===null||!/^\d+(?:\.\d+)?$/.test(String(raw).trim()))return null;
 const n=Number(raw);
 return Number.isFinite(n)&&n>0?n:null;
}
export function resolveStorePaint(stores,tags,height,inferredLevels=null){
 if(!stores?.length||!Number.isFinite(height)||height<=0||'min_height' in tags||'building:min_level' in tags)return [];
 const count=positive(tags['building:levels']);
 if(tags['building:levels']!==undefined&&!Number.isSafeInteger(count))return [];
 const inferred=Number.isSafeInteger(inferredLevels)&&inferredLevels>0;
 if(count===null&&positive(tags.height)===null&&!inferred)return [];
 const floorHeight=count!==null?height/count:inferred?height/inferredLevels:3;
 if(!Number.isFinite(floorHeight)||floorHeight<=0)return [];
 const spans=[];
 for(const store of stores){
  const raw=String(normalizeDrawingLevel(store.level)??'').trim();
  if(!/^-?\d+(?:\s*;\s*-?\d+)*$/.test(raw))continue;
  const levels=[...new Set(raw.split(';').map(Number))];
  if(levels.some(n=>!Number.isSafeInteger(n)||n>=0&&((count!==null&&n>=count)||n*floorHeight>=height-1e-8)))continue;
  for(const level of levels){
   if(level<0)continue;
   const bottom=level*floorHeight,top=Math.min(height,(level+1)*floorHeight);
   if(top>bottom)spans.push({bottom,top,brand:store.brand});
  }
 }
 spans.sort((a,b)=>a.bottom-b.bottom||a.top-b.top);
 // Conflicting brand claims cannot determine which storefront owns a floor.
 const ambiguous=new Set();
 for(let i=0;i<spans.length;i++)
  for(let j=i+1;j<spans.length&&spans[j].bottom<spans[i].top-1e-8;j++)
   if(spans[i].brand.id!==spans[j].brand.id){ambiguous.add(spans[i]);ambiguous.add(spans[j]);}
 const unique=[];
 for(const span of spans){
  if(ambiguous.has(span))continue;
  const last=unique.at(-1);
  if(last&&last.brand.id===span.brand.id&&span.bottom<last.top-1e-8)last.top=Math.max(last.top,span.top);
  else unique.push({...span});
 }
 return unique;
}
export function resolveImageBrandPaint(stores,tags,height,inferredLevels=null,brandId){
 return resolveStorePaint((stores||[]).filter(s=>s.brand?.id===brandId),tags,height,inferredLevels);
}
