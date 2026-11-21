import {reconcilePendingOsmTagChanges,applyPendingOsmTagChangesToMap} from './osm-pending-changes.js?v=live-overlay-step2-20261122';
import {applyOsmReviewStorageChecksToMap} from './osm-review-storage-check.js?v=3d-review-sync-20261122';
// Two independent 2km Matsudo snapshots. No 500m or live Overpass fetch.
const TILE_ROOTS=Object.freeze({
 old:'./maps/data/tiles-2km/',
 new:'./maps/data/tiles-2km-geofabrik/'
});
export const TEST_TILE_ID='0_0';
const facilityKeys=['shop','amenity','tourism','office','leisure','healthcare'];
function verify(map){
 if(map?.source!=='OpenStreetMap contributors'||!Array.isArray(map.elements))throw Error('OSM形式不正');
 const buildings=map.elements.filter(e=>e.type==='way'&&e.tags?.building&&e.geometry?.length>=4).length;
 const roads=map.elements.filter(e=>e.type==='way'&&e.tags?.highway&&e.geometry?.length>=2).length;
 const facilities=map.elements.filter(e=>facilityKeys.some(k=>e.tags?.[k])).length;
 if(buildings<10||roads<10||facilities<1)throw Error('地図JSONデータ不足');
 return map;
}
export async function loadMap({onLog=()=>{},signal,source='old'}={}){
 if(!Object.prototype.hasOwnProperty.call(TILE_ROOTS,source))throw Error('不明な地図ソース: '+source);
 const start=performance.now();
 const root=TILE_ROOTS[source];
 const label=source==='old'?'旧2km (OSM)':'新2km (Geofabrik)';
 onLog('JSON: '+label+' 索引読み込み開始');
 const indexResponse=await fetch(root+'index.json',{cache:'no-cache',signal});
 onLog('JSON: '+label+' 索引 HTTP '+indexResponse.status+' / '+Math.round(performance.now()-start)+'ms');
 if(!indexResponse.ok)throw Error(label+' 索引 HTTP '+indexResponse.status);
 const index=await indexResponse.json();
 const filename=index?.tiles?.[TEST_TILE_ID];
 const expected=new RegExp('^tile_'+TEST_TILE_ID+'_\\d{14}\\.json$');
 if(typeof filename!=='string'||!expected.test(filename))throw Error(label+' タイル指定が不正: '+TEST_TILE_ID);
 const response=await fetch(root+filename,{cache:'no-cache',signal});
 onLog('JSON: '+label+' '+filename+' HTTP '+response.status+' / '+Math.round(performance.now()-start)+'ms');
 if(!response.ok)throw Error(label+' JSON HTTP '+response.status);
 const map=verify(await response.json());
 if(map.tile?.id!==TEST_TILE_ID||map.tile?.sizeM!==2000||map.tile?.gridX!==0||map.tile?.gridY!==0)
  throw Error(label+' タイルID/サイズ/原点が不正: '+TEST_TILE_ID);
 // Only the validated NEW Geofabrik map may release absorbed local edits.
 if(source==='new'){
  const options={source,onWarning:msg=>onLog('OSM差分: '+msg)};
  reconcilePendingOsmTagChanges(map,options);
  const applied=applyPendingOsmTagChangesToMap(map,options);
  if(applied)onLog('OSM差分: '+applied+'件を新Geofabrik地図へ反映');
  // Review-only localStorage is a separate layer, with its own originals
  // captured AFTER any legitimate production-pending overlay.
  const testApplied=applyOsmReviewStorageChecksToMap(map,options);
  if(testApplied)onLog('OSM動作確認: '+testApplied+'件を新2km表示に仮反映');
 }
 onLog('JSON: '+label+' 検証PASS / 要素 '+map.elements.length+'件 / '+Math.round(performance.now()-start)+'ms');
 return map;
}
