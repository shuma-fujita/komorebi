// Live Matsudo 500m OSM snapshot. Public Overpass is best-effort; callers keep a local JSON fallback.
export const OVERPASS_ENDPOINTS=[
 'https://overpass.private.coffee/api/interpreter',
 'https://overpass-api.de/api/interpreter'
];
export const OVERPASS_TIMEOUT_MS=15000;
// Match the existing matsudo.json 500m bounding box and map-builder origin.
export const MATSUDo_BBOX=[35.782194,139.897842,35.786686,139.903378];
const FACILITY_KEYS=['shop','amenity','tourism','office','leisure','healthcare'];
const WAY_KEYS=[...FACILITY_KEYS,'building','highway','railway'];
const hasTag=(tags,keys)=>keys.some(key=>Object.prototype.hasOwnProperty.call(tags||{},key));
export function buildMatsudoOverpassQuery(){
 const bbox=MATSUDo_BBOX.join(',');
 // Regex on tag keys keeps the request compact. "out geom" includes way vertices.
 return '[out:json][timeout:20];('+
  'node[~"^(shop|amenity|tourism|office|leisure|healthcare)$"~"."]('+bbox+');'+
  'way[~"^(building|highway|railway|shop|amenity|tourism|office|leisure|healthcare)$"~"."]('+bbox+');'+
  'relation[~"^(shop|amenity|tourism|office|leisure|healthcare)$"~"."]('+bbox+');'+
  ');out body geom;';
}
export function normalizeMatsudoOverpass(data){
 if(!Array.isArray(data?.elements)||data.remark)throw Error('Overpassの応答が不正: '+String(data?.remark||'elementsなし'));
 const elements=[];
 for(const element of data.elements){
  const tags=element.tags||{};
  if(element.type==='node'){
   if(!hasTag(tags,FACILITY_KEYS)||!Number.isFinite(element.lat)||!Number.isFinite(element.lon))continue;
   elements.push({type:'node',id:element.id,version:element.version??null,tags,lat:element.lat,lon:element.lon});
  }else if(element.type==='way'){
   if(!hasTag(tags,WAY_KEYS)||!Array.isArray(element.geometry))continue;
   const geometry=element.geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>({lat:p.lat,lon:p.lon}));
   if(geometry.length<2)continue;
   elements.push({type:'way',id:element.id,version:element.version??null,tags,geometry});
  }else if(element.type==='relation'&&hasTag(tags,FACILITY_KEYS)){
   elements.push({type:'relation',id:element.id,version:element.version??null,tags,
    members:(element.members||[]).map(m=>({type:m.type,ref:m.ref,role:m.role||''}))});
  }
 }
 return {source:'OpenStreetMap contributors',license:'ODbL-1.0',center:[35.78444,139.90061],
  bbox:MATSUDo_BBOX.join(','),elements,osmTimestamp:data.osm3s?.timestamp_osm_base||null};
}
// Two endpoints share one 15s overall budget, so failover never doubles the wait.
export async function fetchLiveMatsudoMap({signal,onLog=()=>{},timeoutMs=OVERPASS_TIMEOUT_MS,fetchImpl=fetch}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
 const started=performance.now();
 const query=encodeURIComponent(buildMatsudoOverpassQuery());
 const errors=[];
 for(let i=0;i<OVERPASS_ENDPOINTS.length;i++){
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  const elapsed=performance.now()-started,remaining=timeoutMs-elapsed;
  if(remaining<=0){onLog('OSM最新500m: 全体時間上限 '+Math.round(timeoutMs/1000)+'秒に到達');break;}
  const endpoint=OVERPASS_ENDPOINTS[i];
  const host=new URL(endpoint).hostname;
  const attemptBudget=Math.max(1,Math.floor(i===0?Math.min(8000,remaining):remaining));
  const controller=new AbortController();
  const abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),attemptBudget);
  const attemptStart=performance.now();
  try{
   onLog('OSM最新500m: '+(i+1)+'/'+OVERPASS_ENDPOINTS.length+' '+host+' 取得開始（上限'+Math.ceil(attemptBudget/1000)+'秒）');
   const response=await fetchImpl(endpoint+'?data='+query,{signal:controller.signal,cache:'no-store'});
   onLog('OSM最新500m: '+host+' HTTP '+response.status+' / '+Math.round(performance.now()-attemptStart)+'ms');
   if(!response.ok)throw Error('HTTP '+response.status);
   const result=normalizeMatsudoOverpass(await response.json());
   if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
   if(controller.signal.aborted)throw Error('応答タイムアウト');
   onLog('OSM最新500m: 取得・変換 '+Math.round(performance.now()-started)+'ms / '+result.elements.length+'件 / OSM反映時刻 '+(result.osmTimestamp||'不明')+' / 接続先 '+host);
   return result;
  }catch(error){
   if(signal?.aborted)throw error;
   const reason=controller.signal.aborted?'タイムアウト':String(error.message||error);
   errors.push(host+': '+reason);
   onLog('OSM最新500m: '+host+' 失敗 ('+reason+') / '+Math.round(performance.now()-attemptStart)+'ms');
  }finally{
   clearTimeout(timer);
   signal?.removeEventListener('abort',abort);
  }
 }
 throw Error('Overpass全接続先失敗：'+errors.join(' / '));
}
