// Live Matsudo 250m OSM snapshot. Public Overpass is best-effort; callers keep a local JSON fallback.
export const OVERPASS_ENDPOINTS=Object.freeze({
 coffee:'https://overpass.private.coffee/api/interpreter',
 official:'https://overpass-api.de/api/interpreter'
});
export const OVERPASS_ENDPOINT=OVERPASS_ENDPOINTS.coffee;
export function resolveOverpassEndpoint(server='coffee'){
 if(!Object.prototype.hasOwnProperty.call(OVERPASS_ENDPOINTS,server))throw Error('許可されていないOverpass接続先');
 return OVERPASS_ENDPOINTS[server];
}
export const OVERPASS_TIMEOUT_MS=120000;
// Centered on the existing Matsudo 500m map origin; half-size is 125m.
export const MATSUDo_BBOX=[35.783317,139.899226,35.785563,139.901994];
const FACILITY_KEYS=['shop','amenity','tourism','office','leisure','healthcare'];
const WAY_KEYS=[...FACILITY_KEYS,'building','highway','railway'];
const hasTag=(tags,keys)=>keys.some(key=>Object.prototype.hasOwnProperty.call(tags||{},key));
export function buildMatsudoOverpassQuery(){
 const bbox=MATSUDo_BBOX.join(',');
 // Regex on tag keys keeps the request compact. "out geom" includes way vertices.
 return '[out:json][timeout:125];('+
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
  bbox:MATSUDo_BBOX.join(','),areaSizeM:250,elements,osmTimestamp:data.osm3s?.timestamp_osm_base||null};
}
// One live request only, with up to 120 seconds for the primary server.
export async function fetchLiveMatsudoMap({signal,onLog=()=>{},timeoutMs=OVERPASS_TIMEOUT_MS,fetchImpl=fetch,server='coffee'}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
 const started=performance.now();
 const controller=new AbortController();
 const abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 const endpoint=resolveOverpassEndpoint(server);
 const host=new URL(endpoint).hostname;
 try{
  onLog('OSM最新250m: '+host+' 取得開始（上限'+Math.round(timeoutMs/1000)+'秒）');
  const response=await fetchImpl(endpoint+'?data='+encodeURIComponent(buildMatsudoOverpassQuery()),{signal:controller.signal,cache:'no-store'});
  onLog('OSM最新250m: '+host+' HTTP '+response.status+' / '+Math.round(performance.now()-started)+'ms');
  if(!response.ok)throw Error('HTTP '+response.status);
  const result=normalizeMatsudoOverpass(await response.json());
  const buildings=result.elements.filter(e=>e.type==='way'&&e.tags?.building&&e.geometry?.length>=4).length;
  const roads=result.elements.filter(e=>e.type==='way'&&e.tags?.highway&&e.geometry?.length>=2).length;
  const facilities=result.elements.filter(e=>hasTag(e.tags,FACILITY_KEYS)).length;
  if(buildings<10||roads<10||facilities<1)throw Error('地図データ不足（建物'+buildings+'・道路'+roads+'・施設'+facilities+'）');
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  if(controller.signal.aborted)throw Error('応答タイムアウト');
  onLog('OSM最新250m: 取得・変換 '+Math.round(performance.now()-started)+'ms / '+result.elements.length+'件 / OSM反映時刻 '+(result.osmTimestamp||'不明')+' / 接続先 '+host);
  return result;
 }catch(error){
  if(signal?.aborted)throw error;
  const reason=controller.signal.aborted?'タイムアウト':String(error.message||error);
  onLog('OSM最新250m: '+host+' 失敗 ('+reason+') / '+Math.round(performance.now()-started)+'ms');
  throw Error('Overpass取得失敗：'+host+': '+reason);
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener('abort',abort);
 }
}
