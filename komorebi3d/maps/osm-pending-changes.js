// Canonical local OSM tag-change cache: one key per OSM element.
// osmVersion=null: unsent local review; positive integer: confirmed OSM write.
// The map-source version (element.version) is independent of osmVersion.
// This module never sends changes to an OSM API.
const PREFIX='komorebi3d:osm-tag-changes:v2:';
const OLD_PRODUCTION='komorebi3d:osm-production-pending:v1:';
const OLD_REVIEW='komorebi3d:osm-review-storage-check:v1:';
const TYPES=new Set(['node','way','relation']);
const memoryFallback=new Map();
const releasedThisSession=new Set();
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const warn=(onWarning,message)=>{
 if(typeof onWarning==='function'){try{onWarning(message);}catch(error){console.warn(message,error);}}
 else console.warn(message);
};
export function osmTagChangeStorageKey(type,id){
 const value=String(id??'');
 if(!TYPES.has(type)||!/^[1-9]\d*$/.test(value))throw Error('OSM要素の種別またはIDが不正です。');
 return PREFIX+type+'/'+value;
}
function normalizeChanges(changes){
 if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('変更タグが不正です。');
 const result=Object.create(null);
 for(const [key,value] of Object.entries(changes)){
  if(!key||/[\u0000-\u001f=]/.test(key)||(value!==null&&typeof value!=='string'))
   throw Error('変更タグの名前または値が不正です。');
  result[key]=value;
 }
 if(!Object.keys(result).length)throw Error('保存するタグ変更がありません。');
 return result;
}
function normalizeTags(tags){
 if(tags===null||tags===undefined)return null;
 if(typeof tags!=='object'||Array.isArray(tags))throw Error('タグ一覧が不正です。');
 const result=Object.create(null);
 for(const [key,value] of Object.entries(tags)){
  if(!key||/[\u0000-\u001f=]/.test(key)||typeof value!=='string')
   throw Error('タグ一覧の名前または値が不正です。');
  result[key]=value;
 }
 return result;
}
function normalizeVersion(version){
 if(version===null)return null;
 if(!Number.isSafeInteger(version)||version<1)throw Error('本番OSMの確定バージョンが不正です。');
 return version;
}
function normalizeRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('OSM変更データが不正です。');
 const type=value.type,id=String(value.id??'');
 osmTagChangeStorageKey(type,id);
 const osmVersion=normalizeVersion(value.osmVersion);
 const changes=normalizeChanges(value.changes);
 const tags=normalizeTags(value.tags);
 const baseTags=normalizeTags(value.baseTags);
 if(osmVersion!==null&&(tags!==null||baseTags!==null))throw Error('本番確定記録にテスト用タグ一覧は保存できません。');
 let confirmedOsm=null;
 if(value.confirmedOsm!==null&&value.confirmedOsm!==undefined){
  if(osmVersion!==null)throw Error('本番確定情報が重複しています。');
  confirmedOsm={osmVersion:normalizeVersion(value.confirmedOsm.osmVersion),
   changes:normalizeChanges(value.confirmedOsm.changes)};
  if(confirmedOsm.osmVersion===null)throw Error('本番確定情報にバージョンがありません。');
 }
 return {type,id,osmVersion,changes,tags,baseTags,confirmedOsm};
}
function readKey(key,onWarning){
 try{
  const text=localStorage.getItem(key);
  if(text===null)return null;
  const entry=normalizeRecord(JSON.parse(text));
  if(osmTagChangeStorageKey(entry.type,entry.id)!==key)throw Error('保存キーとOSM IDが一致しません。');
  return entry;
 }catch(error){warn(onWarning,'OSMタグ変更の読み取り失敗: '+String(error.message||error));return null;}
}
function legacyRecord(text,type,id,prefix){
 const value=JSON.parse(text);
 if(value?.type!==type||String(value?.id??'')!==id)throw Error('旧保存キーとOSM IDが一致しません。');
 if(prefix===OLD_PRODUCTION){
  const version=Number(value.version);
  return normalizeRecord({type,id,osmVersion:version,changes:value.changes});
 }
 return normalizeRecord({type,id,osmVersion:null,changes:value.changes,
  tags:value.tags??null,baseTags:value.baseTags??null});
}
function migrate(type,id,{onWarning}={}){
 const key=osmTagChangeStorageKey(type,id),prodKey=OLD_PRODUCTION+type+'/'+id,
  reviewKey=OLD_REVIEW+type+'/'+id;
 let current=readKey(key,onWarning);
 let prodText=null,reviewText=null;
 try{prodText=localStorage.getItem(prodKey);reviewText=localStorage.getItem(reviewKey);}
 catch(error){warn(onWarning,'旧localStorageの取得失敗: '+String(error.message||error));return current;}
 if(prodText===null&&reviewText===null)return current;
 let prod=null,review=null;
 try{
  if(prodText!==null)prod=legacyRecord(prodText,type,id,OLD_PRODUCTION);
  if(reviewText!==null)review=legacyRecord(reviewText,type,id,OLD_REVIEW);
 }catch(error){
  warn(onWarning,'旧OSMタグ変更の形式が不正なため自動移行しません: '+String(error.message||error));
  return current;
 }
 if(current){
  // A user may have saved a new v2 record before an interrupted migration.
  // Do not clobber the new record with an older legacy copy.
  if(review||prod)warn(onWarning,'旧OSMタグ変更が残っています。v2の保存データを優先し、旧データは保護します。');
  return current;
 }
 // When both old namespaces exist for one OSM element, preserve BOTH in
 // one v2 record. The active local review is the visible overlay, while its
 // prior confirmed OSM write remains nested for Geofabrik reconciliation.
 const incoming=review?
  {...review,confirmedOsm:prod?{osmVersion:prod.osmVersion,changes:prod.changes}:null}:prod;
 if(!incoming)return null;
 const payload=JSON.stringify(incoming);
 try{
  localStorage.setItem(key,payload);
  if(localStorage.getItem(key)!==payload)throw Error('書き込み確認失敗');
 }catch(error){
  warn(onWarning,'旧OSMタグ変更を移行できません。旧キーは保持します: '+String(error.message||error));
  return incoming; // still render the preserved legacy data
 }
 // New key verified; remove only the successfully migrated old keys.
 try{if(prodText!==null)localStorage.removeItem(prodKey);}
 catch(error){warn(onWarning,'旧本番キーの削除失敗: '+String(error.message||error));}
 try{if(reviewText!==null)localStorage.removeItem(reviewKey);}
 catch(error){warn(onWarning,'旧動作確認キーの削除失敗: '+String(error.message||error));}
 return normalizeRecord(incoming);
}
export function getSavedOsmTagChange(type,id,{onWarning}={}){
 const key=osmTagChangeStorageKey(type,id);
 if(releasedThisSession.has(key))return null;
 const entry=memoryFallback.get(key)||migrate(type,String(id),{onWarning});
 return entry?normalizeRecord(entry):null;
}
export function getAllSavedOsmTagChanges({onWarning}={}){
 const ids=new Set();
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   for(const prefix of [PREFIX,OLD_PRODUCTION,OLD_REVIEW]){
    if(!key?.startsWith(prefix))continue;
    const suffix=key.slice(prefix.length);
    const slash=suffix.indexOf('/');
    if(slash>0)ids.add(suffix);
    break;
   }
  }
 }catch(error){warn(onWarning,'保存済みOSMタグ変更一覧の読み取り失敗: '+String(error.message||error));}
 for(const key of memoryFallback.keys())ids.add(key.slice(PREFIX.length));
 const result=[];
 for(const suffix of ids){
  const slash=suffix.indexOf('/');
  if(slash<1)continue;
  try{
   const record=getSavedOsmTagChange(suffix.slice(0,slash),suffix.slice(slash+1),{onWarning});
   if(record)result.push(record);
  }catch(error){warn(onWarning,'保存済みOSMタグ変更が不正です: '+String(error.message||error));}
 }
 return result;
}
// One shared write path for both confirmed production and unsent local edits.
// An unsent draft must never silently replace an existing confirmed OSM write.
export function saveStoredOsmTagChange(value,{onWarning}={}){
 const incoming=normalizeRecord(value);
 const key=osmTagChangeStorageKey(incoming.type,incoming.id);
 const previous=getSavedOsmTagChange(incoming.type,incoming.id,{onWarning});
 if(incoming.osmVersion===null&&previous?.osmVersion!==null&&previous?.osmVersion!==undefined)
  throw Error('同じOSM要素に本番送信済みの反映待ち記録があります。動作確認で上書きできません。');
 if(incoming.osmVersion!==null&&previous?.osmVersion!==null&&previous?.osmVersion!==undefined&&
  incoming.osmVersion<previous.osmVersion)
  throw Error('新しい差分より古いOSM versionは登録できません。');
 const record=normalizeRecord(incoming.osmVersion!==null?{
  ...incoming,
  changes:{...(previous?.osmVersion!==null&&previous?.osmVersion!==undefined?previous.changes:{}),...incoming.changes},
  confirmedOsm:null
 }:{
  ...incoming,
  confirmedOsm:previous?.confirmedOsm??null
 });
 const payload=JSON.stringify(record);
 try{
  localStorage.setItem(key,payload);
  if(localStorage.getItem(key)!==payload)throw Error('保存内容の確認に失敗しました。');
  memoryFallback.delete(key);
  releasedThisSession.delete(key);
  return {entry:record,key,persisted:true};
 }catch(error){
  if(record.osmVersion===null)throw error; // A local smoke check must verify persistent storage.
  memoryFallback.set(key,record);
  releasedThisSession.delete(key);
  warn(onWarning,'OSM編集の端末保存に失敗しました。一時的にメモリへ保持します。');
  return {entry:record,key,persisted:false};
 }
}
export function releaseStoredOsmTagChange(type,id,{onWarning}={}){
 const key=osmTagChangeStorageKey(type,id);
 const suffix=type+'/'+String(id);
 // Delete the active v2 key and legacy keys left by an interrupted migration.
 const keys=[key,OLD_PRODUCTION+suffix,OLD_REVIEW+suffix];
 for(const candidate of keys){
  localStorage.removeItem(candidate);
  if(localStorage.getItem(candidate)!==null)throw Error('保存データを開放できません: '+candidate);
 }
 memoryFallback.delete(key);
 releasedThisSession.add(key);
 return {key,removedKeys:keys};
}
export function recordConfirmedOsmTagChanges(value,{onWarning}={}){
 const version=Number(value?.version);
 if(!Number.isSafeInteger(version)||version<1)throw Error('OSM versionが不正です。');
 const result=saveStoredOsmTagChange({type:value.type,id:value.id,osmVersion:version,
  changes:value.changes,tags:null,baseTags:null},{onWarning});
 // Keep the existing post-API-success callback contract; the on-disk record
 // contains only osmVersion, while the scene patcher expects entry.version.
 return {...result,entry:{...result.entry,version:result.entry.osmVersion}};
}
function confirmedPart(entry){
 if(entry.osmVersion!==null)return {osmVersion:entry.osmVersion,changes:entry.changes};
 return entry.confirmedOsm;
}
export function getPendingOsmTagChange(type,id,options={}){
 const entry=getSavedOsmTagChange(type,id,options),confirmed=entry&&confirmedPart(entry);
 return confirmed?{type:entry.type,id:entry.id,version:confirmed.osmVersion,changes:confirmed.changes}:null;
}
export function getAllPendingOsmTagChanges(options={}){
 return getAllSavedOsmTagChanges(options).flatMap(entry=>{
  const confirmed=confirmedPart(entry);
  return confirmed?[{type:entry.type,id:entry.id,version:confirmed.osmVersion,changes:confirmed.changes}]:[];
 });
}
function absorbed(entry,element){
 const version=Number(element.version);
 if(!Number.isSafeInteger(version)||version<entry.osmVersion)return false;
 if(version>entry.osmVersion)return true;
 const tags=element.tags||{};
 return Object.entries(entry.changes).every(([tag,val])=>
  val===null?!own(tags,tag):own(tags,tag)&&tags[tag]===val);
}
// Only confirmed OSM writes may be automatically cleared after Geofabrik catches up.
export function reconcilePendingOsmTagChanges(map,{source,onWarning}={}){
 if(source!=='new')return 0;
 if(!Array.isArray(map?.elements))throw Error('地図JSONの要素一覧が不正です。');
 const sourceById=new Map(map.elements.map(el=>[el.type+'/'+el.id,el]));
 let released=0;
 for(const entry of getAllSavedOsmTagChanges({onWarning})){
  const confirmed=confirmedPart(entry),el=sourceById.get(entry.type+'/'+entry.id);
  if(!confirmed||!el||!absorbed(confirmed,el))continue;
  if(entry.osmVersion!==null){
   const key=osmTagChangeStorageKey(entry.type,entry.id);
   try{releaseStoredOsmTagChange(entry.type,entry.id,{onWarning});released++;}
   catch(error){warn(onWarning,'Geofabrik反映済み記録の開放失敗: '+String(error.message||error));}
  }else{
   // Local review remains, but the nested production-confirmation escrow ends.
   const updated={...entry,confirmedOsm:null};
   try{
    const key=osmTagChangeStorageKey(entry.type,entry.id);
    localStorage.setItem(key,JSON.stringify(updated));
    if(localStorage.getItem(key)!==JSON.stringify(updated))throw Error('保存確認失敗');
    released++;
   }catch(error){warn(onWarning,'本番反映済み情報の更新失敗: '+String(error.message||error));}
  }
 }
 return released;
}
// Apply exactly one saved overlay per element. Capture original Geofabrik
// tags for manual release, and never overwrite OSM map version with null.
export function applySavedOsmTagChangesToMap(map,{source,onWarning}={}){
 if(source!=='new')return 0;
 if(!Array.isArray(map?.elements))throw Error('地図JSONの要素一覧が不正です。');
 const originals=new Map();
 Object.defineProperty(map,'reviewStorageOriginalTags',{value:originals,configurable:true});
 const records=new Map(getAllSavedOsmTagChanges({onWarning}).map(entry=>[entry.type+'/'+entry.id,entry]));
 let count=0;
 for(const element of map.elements){
  const key=element.type+'/'+element.id,entry=records.get(key);
  if(!entry)continue;
  const mapVersion=Number(element.version);
  const confirmed=confirmedPart(entry);
  if(confirmed&&Number.isSafeInteger(mapVersion)&&mapVersion>confirmed.osmVersion)continue;
  originals.set(key,{...(element.tags||{})});
  let tags={...(element.tags||{})};
  if(confirmed)for(const [tag,val] of Object.entries(confirmed.changes)){
   if(val===null)delete tags[tag];else tags[tag]=val;
  }
  if(entry.osmVersion===null){
   if(entry.tags!==null)tags={...entry.tags};
   else for(const [tag,val] of Object.entries(entry.changes)){
    if(val===null)delete tags[tag];else tags[tag]=val;
   }
  }else element.version=entry.osmVersion;
  element.tags=tags;
  count++;
 }
 return count;
}
// Backward-compatible exported name: applies the one canonical overlay.
export const applyPendingOsmTagChangesToMap=applySavedOsmTagChangesToMap;
