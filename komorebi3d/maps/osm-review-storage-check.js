// Shared localStorage smoke-check controls; test and confirmed OSM edits
// now use the SAME key, release function and tag-change storage module.
// osmVersion=null is an unsent local review; this module does not send to OSM.
import {osmTagChangeStorageKey,getSavedOsmTagChange,getAllSavedOsmTagChanges,
 saveStoredOsmTagChange,releaseStoredOsmTagChange,applySavedOsmTagChangesToMap}
 from './osm-pending-changes.js?v=auto-release-20261126';
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const reviewKey=review=>osmTagChangeStorageKey(review?.osm?.type,review?.osm?.id);
function testPayload(review){
 const key=reviewKey(review);
 const previous=getOsmReviewStorageCheck(review.osm.type,review.osm.id);
 const current=review?.changes;
 if(!current||typeof current!=='object'||Array.isArray(current))
  throw Error('保存する変更内容が不正です。');
 if(previous?.osmVersion!==null&&previous?.osmVersion!==undefined)
  throw Error('本番OSM送信済みの反映待ちデータがあるため、動作確認で上書きできません。');
 const baseTags=previous?.baseTags||review.originalTags||null;
 const tags=review.tags;
 let changes={...current};
 if(baseTags&&tags){
  changes={};
  for(const tag of new Set([...Object.keys(baseTags),...Object.keys(tags)]))
   if(baseTags[tag]!==tags[tag])changes[tag]=own(tags,tag)?tags[tag]:null;
 }
 if(!Object.keys(changes).length)throw Error('保存する変更がありません。');
 return {key,record:{type:review.osm.type,id:String(review.osm.id),
  osmVersion:null,changes,tags,baseTags}};
}
export function getOsmReviewStorageCheck(type,id){
 return getSavedOsmTagChange(type,id);
}
export function getAllOsmReviewStorageChecks({onWarning}={}){
 return getAllSavedOsmTagChanges({onWarning});
}
// Compatibility for older callers. Loader now applies the single shared
// overlay itself, not a second separate test overlay.
export const applyOsmReviewStorageChecksToMap=applySavedOsmTagChangesToMap;
export function saveOsmReviewStorageCheck(review){
 const {record,key}=testPayload(review);
 const result=saveStoredOsmTagChange(record);
 if(!result.persisted)throw Error('保存内容を読み取れません。');
 return key;
}
export function releaseOsmReviewStorageCheck(review){
 const key=reviewKey(review);
 releaseStoredOsmTagChange(review.osm.type,review.osm.id);
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
