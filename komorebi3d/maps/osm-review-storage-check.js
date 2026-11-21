// LocalStorage smoke-check controls for an unsent tag review.
// Test-only namespace: NEVER create a confirmed-production pending OSM record.
// This helper is reusable by the mock and (after UI approval) the game.
const TEST_PREFIX='komorebi3d:osm-review-storage-check:v1:';
const TYPES=new Set(['node','way','relation']);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

function reviewKey(review){
 const osm=review?.osm;
 const id=String(osm?.id??'');
 if(!TYPES.has(osm?.type)||!/^[1-9]\d*$/.test(id))
  throw Error('OSM要素のIDが不正です。');
 return TEST_PREFIX+osm.type+'/'+id;
}
function testPayload(review){
 const key=reviewKey(review);
 const changes=review?.changes;
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length)
  throw Error('保存できる変更内容がありません。');
 return {key,payload:JSON.stringify({
  type:review.osm.type,id:String(review.osm.id),version:review.osm.version??null,
  changes,tags:review.tags
 })};
}
function decodeStored(text,key){
 const value=JSON.parse(text);
 if(!value||reviewKey({osm:value})!==key||!value.changes||
  typeof value.changes!=='object'||Array.isArray(value.changes))
  throw Error('保存した動作確認用データが不正です。');
 const changes=Object.create(null);
 for(const [tag,v] of Object.entries(value.changes)){
  if(!tag||/[\u0000-\u001f=]/.test(tag)||(typeof v!=='string'&&v!==null))
   throw Error('保存したタグ差分が不正です。');
  changes[tag]=v;
 }
 let tags=null;
 if(value.tags&&typeof value.tags==='object'&&!Array.isArray(value.tags)){
  tags=Object.create(null);
  for(const [tag,v] of Object.entries(value.tags)){
   if(!tag||/[\u0000-\u001f=]/.test(tag)||typeof v!=='string')
    throw Error('保存したタグ一覧が不正です。');
   tags[tag]=v;
  }
 }
 return {type:value.type,id:String(value.id),version:value.version,changes,tags};
}
export function getOsmReviewStorageCheck(type,id){
 const key=reviewKey({osm:{type,id}});
 const text=localStorage.getItem(key);
 return text===null?null:decodeStored(text,key);
}
export function getAllOsmReviewStorageChecks({onWarning}={}){
 const result=[];
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(!key?.startsWith(TEST_PREFIX))continue;
   try{result.push(decodeStored(localStorage.getItem(key),key));}
   catch(error){onWarning?.('動作確認データの読み取り失敗: '+String(error.message||error));}
  }
 }catch(error){onWarning?.('動作確認用localStorageの一覧取得に失敗: '+String(error.message||error));}
 return result;
}
// Called only after the real-production pending layer is applied to the NEW
// Geofabrik map. Preserve the pre-test tags for restoring a building in 3D.
export function applyOsmReviewStorageChecksToMap(map,{source,onWarning}={}){
 if(source!=='new')return 0;
 if(!Array.isArray(map?.elements))throw Error('地図JSONの要素一覧が不正です。');
 const originals=new Map();
 Object.defineProperty(map,'reviewStorageOriginalTags',{value:originals});
 const records=new Map(getAllOsmReviewStorageChecks({onWarning})
  .map(record=>[record.type+'/'+record.id,record]));
 let count=0;
 for(const element of map.elements){
  const key=element.type+'/'+element.id,record=records.get(key);
  if(!record)continue;
  originals.set(key,{...(element.tags||{})});
  const tags=record.tags?{...record.tags}:{...(element.tags||{})};
  if(!record.tags)for(const [tag,value] of Object.entries(record.changes)){
   if(value===null)delete tags[tag];else tags[tag]=value;
  }
  element.tags=tags;
  count++;
 }
 return count;
}
export function saveOsmReviewStorageCheck(review){
 const {key,payload}=testPayload(review);
 localStorage.setItem(key,payload);
 if(localStorage.getItem(key)!==payload)throw Error('保存内容を読み取れません。');
 return key;
}
export function releaseOsmReviewStorageCheck(review){
 const key=reviewKey(review);
 localStorage.removeItem(key);
 if(localStorage.getItem(key)!==null)throw Error('保存データを開放できません。');
 return key;
}
// Insert at the TOP of the confirmation UI. getReview returns only a
// currently displayed draft, never a production save-success callback.
export function prependOsmReviewStorageCheck(reviewPanel,{getReview,onChange}={}){
 if(typeof getReview!=='function')throw Error('確認データの取得処理がありません。');
 const section=document.createElement('section');
 section.className='komo-review-storage-check';
 section.style.cssText='padding:10px 9px;margin:0 0 13px;background:rgba(255,176,68,.08);border:1px solid rgba(255,189,98,.65);border-radius:11px;';
 const heading=document.createElement('strong');
 heading.textContent='動作確認用｜localStorage';
 heading.style.cssText='display:block;margin:0 0 8px;color:#ffdf9d;font:700 12px/1.5 system-ui,-apple-system,sans-serif;';
 const buttons=document.createElement('div');
 buttons.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;';
 const makeButton=(text)=>{
  const button=document.createElement('button');button.type='button';button.textContent=text;
  button.style.cssText='min-width:0;min-height:49px;padding:9px 6px;border:1.5px solid #ffbd62;border-radius:9px;background:#483822;color:#ffe4ae;font:700 12px/1.35 system-ui,-apple-system,sans-serif;white-space:normal;overflow-wrap:anywhere;touch-action:manipulation;cursor:pointer;';
  return button;
 };
 const save=makeButton('ローカルストレージに保存');
 const release=makeButton('ローカルストレージ開放');
 const status=document.createElement('p');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.style.cssText='min-height:1em;margin:8px 0 0;color:#ffd08a;font:11px/1.5 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere;';
 const help=document.createElement('p');
 help.style.cssText='margin:7px 0 0;color:#b8cabe;font:10px/1.5 system-ui,-apple-system,sans-serif;';
 help.textContent='新2kmの3Dへ一時反映します。保存・開放は動作確認専用で、本番OSMへの送信や正式なGeofabrik反映待ち記録にはなりません。';
 const invoke=(action,kind,okText)=>{
  let review;
  try{
   review=getReview();
   action(review);
  }catch(error){
   status.textContent='⚠ '+String(error?.message||error);
   status.style.color='#ffd08a';
   return;
  }
  status.style.color='#d0f6c7';
  status.textContent=okText;
  if(typeof onChange==='function'){
   try{
    const scene=onChange({kind,review});
    if(scene?.applied===false){
     status.style.color='#ffd08a';
     status.textContent=okText+' 3D反映は保留：'+String(scene.reason||'地図の読み込み待ち');
    }else if(scene?.applied===true)status.textContent=okText+' 3Dにも反映しました。';
   }catch(error){
    status.style.color='#ffd08a';
    status.textContent=okText+' ただし3D反映に失敗：'+String(error?.message||error);
   }
  }
 };
 save.addEventListener('click',()=>invoke(saveOsmReviewStorageCheck,'save','✅ 動作確認用データをlocalStorageへ保存しました。'));
 release.addEventListener('click',()=>invoke(releaseOsmReviewStorageCheck,'release','✅ 動作確認用データをlocalStorageから開放しました。'));
 buttons.append(save,release);
 section.append(heading,buttons,status,help);
 reviewPanel.prepend(section);
 return {section,clearStatus(){status.textContent='';}};
}
