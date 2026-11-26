// Canonical local OSM tag-change cache: one key per OSM element.
// Legacy v1 keys are never migrated or automatically removed. Manage them
// explicitly through the localStorage administration panel.
// osmVersion=null: unsent local review; positive integer: confirmed OSM write.
// The map-source version (element.version) is independent of osmVersion.
// This module never sends changes to an OSM API.
const PREFIX='komorebi3d:osm-tag-changes:v2:';
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
 return {type,id,osmVersion,changes,tags,baseTags};
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
export function getSavedOsmTagChange(type,id,{onWarning}={}){
 const key=osmTagChangeStorageKey(type,id);
 if(releasedThisSession.has(key))return null;
 const entry=memoryFallback.get(key)||readKey(key,onWarning);
 return entry?normalizeRecord(entry):null;
}
export function getAllSavedOsmTagChanges({onWarning}={}){
 const keys=new Set();
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(key?.startsWith(PREFIX))keys.add(key);
  }
 }catch(error){warn(onWarning,'保存済みOSMタグ変更一覧の読み取り失敗: '+String(error.message||error));}
 for(const key of memoryFallback.keys())keys.add(key);
 const result=[];
 for(const key of keys){
  const suffix=key.slice(PREFIX.length),slash=suffix.indexOf('/');
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
  changes:{...(previous?.osmVersion!==null&&previous?.osmVersion!==undefined?previous.changes:{}),...incoming.changes}
 }:incoming);
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
export function releaseStoredOsmTagChange(type,id){
 const key=osmTagChangeStorageKey(type,id);
 localStorage.removeItem(key);
 if(localStorage.getItem(key)!==null)throw Error('保存データを開放できません: '+key);
 memoryFallback.delete(key);
 releasedThisSession.add(key);
 return {key,removedKeys:[key]};
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
export function getPendingOsmTagChange(type,id,options={}){
 const entry=getSavedOsmTagChange(type,id,options);
 return entry?.osmVersion===null||!entry?null:
  {type:entry.type,id:entry.id,version:entry.osmVersion,changes:entry.changes};
}
export function getAllPendingOsmTagChanges(options={}){
 return getAllSavedOsmTagChanges(options).filter(entry=>entry.osmVersion!==null)
  .map(entry=>({type:entry.type,id:entry.id,version:entry.osmVersion,changes:entry.changes}));
}
function absorbed(entry,element){
 if(entry.osmVersion!==null){
  const version=Number(element.version);
  return Number.isSafeInteger(version)&&version>=entry.osmVersion;
 }
 // An unsent local edit has no confirmed version; compare only its changes.
 const tags=element.tags||{};
 return Object.entries(entry.changes).every(([tag,val])=>
  val===null?!own(tags,tag):own(tags,tag)&&tags[tag]===val);
}
// Clear confirmed writes by version, local reviews by matching tag changes.
export function reconcilePendingOsmTagChanges(map,{source,onWarning}={}){
 if(source!=='new')return 0;
 if(!Array.isArray(map?.elements))throw Error('地図JSONの要素一覧が不正です。');
 const sourceById=new Map(map.elements.map(el=>[el.type+'/'+el.id,el]));
 let released=0;
 for(const entry of getAllSavedOsmTagChanges({onWarning})){
  const el=sourceById.get(entry.type+'/'+entry.id);
  if(!el||!absorbed(entry,el))continue;
  try{releaseStoredOsmTagChange(entry.type,entry.id);released++;}
  catch(error){warn(onWarning,'Geofabrik反映済み記録の開放失敗: '+String(error.message||error));}
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
  if(entry.osmVersion!==null&&Number.isSafeInteger(mapVersion)&&mapVersion>=entry.osmVersion)continue;
  originals.set(key,{...(element.tags||{})});
  let tags={...(element.tags||{})};
  if(entry.osmVersion!==null)for(const [tag,val] of Object.entries(entry.changes)){
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
