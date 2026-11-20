// Local-only association between production OSM IDs and copied test OSM IDs.
// This never sends data to either OSM API; write actions remain user-confirmed.
const STORE_KEY='komorebi3d-osm-test-links-v1';
const key=(type,id)=>['node','way'].includes(type)&&/^[1-9]\d*$/.test(String(id))?type+'/'+id:null;
export function getOsmTestLink(type,id){
 const k=key(type,id);if(!k)return null;
 try{
  const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
  const entry=saved?.[k];
  if(!entry||!key(entry.type,entry.id)||entry.type!==type)return null;
  return {type:entry.type,id:String(entry.id)};
 }catch{return null;}
}
export function saveOsmTestLink(sourceType,sourceId,testType,testId){
 const sourceKey=key(sourceType,sourceId),testKey=key(testType,testId);
 if(!sourceKey||!testKey||sourceType!==testType)throw Error('OSMコピーIDの対応が不正です');
 try{
  const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
  const next=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
  next[sourceKey]={type:testType,id:String(testId)};
  localStorage.setItem(STORE_KEY,JSON.stringify(next));
  return true;
 }catch{return false;}
}
