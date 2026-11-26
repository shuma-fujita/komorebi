// Shared local-only OSM tag draft and confirmation logic.
// Never performs HTTP requests, writes to OSM, persists to storage, or claims a save.
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);

export function hasOsmTagChanges(originalTags={},draftTags={}){
 return Object.keys(draftTags).some(key=>draftTags[key]!==originalTags[key])||
  Object.keys(originalTags).some(key=>!own(draftTags,key));
}

export function buildOsmTagReview({osm,originalTags={},rows}={}){
 if(!osm||!['node','way','relation'].includes(osm.type)||!String(osm.id??'').trim())
  throw Error('OSM要素の情報が不正です。');
 if(!Array.isArray(rows))throw Error('タグ一覧が不正です。');
 const tags=Object.create(null);
 for(const row of rows){
  const key=String(row?.key??'').trim(),value=String(row?.value??'');
  if(!key){if(value.trim())throw Error('タグ名が空欄です');continue;}
  if(own(tags,key))throw Error('タグ名が重複しています: '+key);
  if(/[\u0000-\u001f=]/.test(key))throw Error('タグ名に使用できない文字が含まれています');
  tags[key]=value;
 }
 const changes=Object.create(null);
 for(const key of new Set([...Object.keys(originalTags),...Object.keys(tags)])){
  if(originalTags[key]!==tags[key])changes[key]=own(tags,key)?tags[key]:null;
 }
 // Tag deletion is not enabled in either environment.
 if(Object.values(changes).some(value=>value===null))throw Error('タグ削除には対応していません。');
 return {osm:{type:osm.type,id:String(osm.id),version:osm.version??null},tags,changes};
}
