// Display-only priority rules for the OSM building tag editor.
// Keep source objects and field values untouched; this only sorts rendered rows.
let orderPromise=null;
export function parseOsmTagOrder(source){
 return String(source).split(/\r?\n/)
  .map(line=>line.trim())
  .filter(line=>line&&!line.startsWith('#'))
  .map(pattern=>new RegExp('^'+pattern.split('*')
   .map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$'));
}
export function orderOsmTagEntries(tags={},rules=[]){
 const entries=Object.entries(tags);
 if(!rules.length||entries.length<2)return entries;
 const rank=key=>{
  const found=rules.findIndex(rule=>rule.test(key));
  return found===-1?rules.length:found;
 };
 return entries.map(([key,value],index)=>({key,value,index,priority:rank(key)}))
  .sort((a,b)=>a.priority-b.priority||a.index-b.index)
  .map(({key,value})=>[key,value]);
}
export function loadOsmTagOrder(){
 if(!orderPromise){
  orderPromise=fetch(new URL('./osm-tags.order',import.meta.url),{cache:'no-cache'})
   .then(response=>{
    if(!response.ok)throw new Error('OSMタグ表示順の取得失敗 HTTP '+response.status);
    return response.text();
   })
   .then(parseOsmTagOrder)
   .catch(error=>{console.warn('OSMタグ表示順を読み込めません。登録順で表示します。',error);return [];});
 }
 return orderPromise;
}
