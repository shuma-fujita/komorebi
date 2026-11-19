// Explicit, read-only Overpass diagnostics. Never affects map rendering or snapshots.
import {OVERPASS_ENDPOINT, MATSUDo_BBOX} from './map-overpass.js?v=single-overpass120-250m-20261119';
export const DIAGNOSTIC_TIMEOUT_MS=20000;
export function buildOverpassDiagnosticQuery(kind){
 if(kind==='ping'){
  // Small interpreter query, not a separate health endpoint.
  return '[out:json][timeout:15];node(35.78443,139.90060,35.78445,139.90062);out count;';
 }
 if(kind==='buildings'){
  return '[out:json][timeout:15];way["building"]('+MATSUDo_BBOX.join(',')+');out count;';
 }
 throw Error('診断種別が不正');
}
export async function runOverpassDiagnostic(kind,{signal,onLog=()=>{},fetchImpl=fetch,timeoutMs=DIAGNOSTIC_TIMEOUT_MS}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
 const controller=new AbortController();
 const abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 const started=performance.now();
 const name=kind==='ping'?'接続確認':kind==='buildings'?'建物のみ':'不明';
 try{
  const query=buildOverpassDiagnosticQuery(kind);
  onLog(name+' 開始 / '+new URL(OVERPASS_ENDPOINT).hostname+' / 上限'+Math.round(timeoutMs/1000)+'秒');
  const response=await fetchImpl(OVERPASS_ENDPOINT+'?data='+encodeURIComponent(query),{signal:controller.signal,cache:'no-store'});
  const elapsed=Math.round(performance.now()-started);
  onLog(name+' HTTP '+response.status+' / '+elapsed+'ms');
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  if(controller.signal.aborted)throw Error('タイムアウト');
  if(!Array.isArray(json?.elements)||json.remark)throw Error('応答形式不正: '+String(json?.remark||'elementsなし'));
  const count=json.elements.find(x=>x.type==='count')?.tags;
  const result={kind,elapsedMs:Math.round(performance.now()-started),count:count?.total??null,osmTimestamp:json.osm3s?.timestamp_osm_base||null};
  onLog(name+' 成功 / '+result.elapsedMs+'ms / '+(result.count===null?'件数不明':result.count+'件')+' / OSM時刻 '+(result.osmTimestamp||'不明'));
  return result;
 }catch(error){
  if(signal?.aborted)throw error;
  const reason=controller.signal.aborted?'タイムアウト':String(error.message||error);
  onLog(name+' 失敗 ('+reason+') / '+Math.round(performance.now()-started)+'ms');
  throw Error(reason);
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener('abort',abort);
 }
}
