// Pending production-OSM tag edits, scoped to this browser origin.
// This module NEVER writes to OSM. Call recordConfirmedOsmTagChanges only
// after the production OSM API has confirmed a write and returned its version.
// Keep only changed tags, not geometry or map tiles.
const STORE_PREFIX='komorebi3d:osm-production-pending:v1:';
const TYPES=new Set(['node','way','relation']);
const memoryFallback=new Map();
const releasedThisSession=new Set();
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

function warn(onWarning,message){
 if(typeof onWarning==='function'){
  try{onWarning(message);}catch(error){console.warn('OSM pending warning callback failed',error);}
 }else console.warn(message);
}
function storageKey(type,id){
 if(!TYPES.has(type)||!/^[1-9]\d*$/.test(String(id)))
  throw Error('OSM要素の種別またはIDが不正です。');
 return STORE_PREFIX+type+'/'+id;
}
function normalizeRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('差分データが不正です。');
 const type=value.type,id=String(value.id??'');
 storageKey(type,id);
 const version=Number(value.version);
 if(!Number.isSafeInteger(version)||version<1)throw Error('OSM versionが不正です。');
 if(!value.changes||typeof value.changes!=='object'||Array.isArray(value.changes))
  throw Error('変更タグが不正です。');
 const changes=Object.create(null);
 for(const [key,tagValue] of Object.entries(value.changes)){
  if(!key||/[\u0000-\u001f=]/.test(key)||(tagValue!==null&&typeof tagValue!=='string'))
   throw Error('変更タグの名前または値が不正です。');
  changes[key]=tagValue; // null means tag deletion
 }
 if(!Object.keys(changes).length)throw Error('保存するタグ変更がありません。');
 return {type,id,version,changes};
}
function readStored(key,onWarning){
 try{
  const text=localStorage.getItem(key);
  if(text===null)return null;
  const entry=normalizeRecord(JSON.parse(text));
  if(storageKey(entry.type,entry.id)!==key)throw Error('OSM IDが保存キーと一致しません。');
  return entry;
 }catch(error){
  warn(onWarning,'OSM差分の読み取りに失敗しました: '+String(error.message||error));
  return null;
 }
}

// The memory copy takes priority over an older localStorage entry when a
// browser quota/security error prevented the latest successful OSM edit from persisting.
export function getPendingOsmTagChange(type,id,{onWarning}={}){
 const key=storageKey(type,String(id));
 if(releasedThisSession.has(key))return null;
 const entry=memoryFallback.get(key)||readStored(key,onWarning);
 return entry?normalizeRecord(entry):null;
}
export function getAllPendingOsmTagChanges({onWarning}={}){
 const entries=new Map();
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(!key?.startsWith(STORE_PREFIX)||releasedThisSession.has(key))continue;
   const entry=readStored(key,onWarning);
   if(entry)entries.set(key,entry);
  }
 }catch(error){
  warn(onWarning,'OSM差分一覧の取得に失敗しました: '+String(error.message||error));
 }
 for(const [key,entry] of memoryFallback)
  if(!releasedThisSession.has(key))entries.set(key,entry);
 return Array.from(entries.values(),entry=>normalizeRecord(entry));
}

// 'changes' contains ONLY the keys changed in the successful production write.
// Successive confirmed writes to the same OSM element are combined, newest key
// values win, and the highest confirmed OSM version is retained.
export function recordConfirmedOsmTagChanges(value,{onWarning}={}){
 const incoming=normalizeRecord(value);
 const key=storageKey(incoming.type,incoming.id);
 const previous=getPendingOsmTagChange(incoming.type,incoming.id,{onWarning});
 if(previous&&incoming.version<previous.version)
  throw Error('新しい差分より古いOSM versionは登録できません。');
 const merged=normalizeRecord({
  ...incoming,
  changes:{...(previous?.changes||{}),...incoming.changes}
 });
 releasedThisSession.delete(key);
 try{
  localStorage.setItem(key,JSON.stringify(merged));
  memoryFallback.delete(key);
  return {entry:merged,persisted:true};
 }catch(error){
  memoryFallback.set(key,merged);
  warn(onWarning,'OSM編集の端末保存に失敗しました。一時的にメモリへ保持します。ページを閉じると未反映の表示が失われます。');
  return {entry:merged,persisted:false};
 }
}
function releasePending(key,onWarning){
 // Release in-memory overlay even if the browser refuses the persistent removal.
 memoryFallback.delete(key);
 releasedThisSession.add(key);
 try{localStorage.removeItem(key);}
 catch(error){warn(onWarning,'反映済みOSM差分の削除に失敗しました: '+String(error.message||error));}
}

// Call ONLY after verifying a newly loaded Geofabrik JSON map.
// A missing OSM element or an older JSON version must never discard an edit.
export function reconcilePendingOsmTagChanges(map,{source,onWarning}={}){
 if(source!=='new')return 0; // Never reconcile against the legacy comparison map.
 if(!Array.isArray(map?.elements))throw Error('地図JSONの要素一覧が不正です。');
 const pending=getAllPendingOsmTagChanges({onWarning});
 if(!pending.length)return 0;
 const targets=new Set(pending.map(entry=>entry.type+'/'+entry.id));
 const elements=new Map();
 for(const element of map.elements){
  const key=element?.type+'/'+element?.id;
  if(targets.has(key))elements.set(key,element);
 }
 let released=0;
 for(const entry of pending){
  const element=elements.get(entry.type+'/'+entry.id);
  if(!element)continue;
  const mapVersion=Number(element.version);
  if(!Number.isSafeInteger(mapVersion)||mapVersion<entry.version)continue;
  if(mapVersion===entry.version){
   const tags=element.tags||{};
   const isAbsorbed=Object.entries(entry.changes).every(([key,value])=>
    value===null?!own(tags,key):own(tags,key)&&tags[key]===value
   );
   if(!isAbsorbed)continue;
  }
  releasePending(storageKey(entry.type,entry.id),onWarning);
  released++;
 }
 return released;
}
