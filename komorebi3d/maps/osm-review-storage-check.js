// Shared localStorage smoke-check controls; test and confirmed OSM edits
// now use the SAME key, release function and tag-change storage module.
// osmVersion=null is an unsent local review; this module does not send to OSM.
import {osmTagChangeStorageKey,getSavedOsmTagChange,getAllSavedOsmTagChanges,
 saveStoredOsmTagChange,releaseStoredOsmTagChange,applySavedOsmTagChangesToMap}
 from './osm-pending-changes.js?v=unified-osm-storage-v2-20261122';
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
export function prependOsmReviewStorageCheck(reviewPanel,{getReview,onChange,showInventory=false}={}){
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
 // Optional storage inventory: production editor enables it; mock remains unchanged.
 // This is an inventory of the current origin, not a global browser inventory.
 // Release removes ONLY the current reviewKey, never other localStorage entries.
 let refreshInventory=()=>{};
 let inventory=null;
 if(showInventory){
  inventory=document.createElement('div');
  inventory.setAttribute('aria-label','このページと同じ保存元のlocalStorage一覧');
  inventory.style.cssText='margin:10px 0 3px;padding:9px 8px;border-top:1px solid rgba(255,189,98,.42);background:rgba(8,18,25,.19);border-radius:8px;';
  const header=document.createElement('div');
  header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;';
  const caption=document.createElement('strong');
  caption.textContent='保存されているlocalStorage（全件）';
  caption.style.cssText='color:#ffe4ae;font:700 12px/1.5 system-ui,-apple-system,sans-serif;';
  const refreshButton=document.createElement('button');
  refreshButton.type='button';
  refreshButton.textContent='一覧を更新';
  refreshButton.style.cssText='flex:none;border:1px solid #91aca0;background:#19372e;color:#d6f9e6;border-radius:7px;padding:5px 8px;font:700 11px system-ui;touch-action:manipulation;';
  header.append(caption,refreshButton);
  const summary=document.createElement('p');
  summary.style.cssText='margin:7px 0;color:#d9ecdb;font:11px/1.5 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere;';
  const list=document.createElement('div');
  list.setAttribute('role','list');
  list.style.cssText='max-height:220px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:6px;';
  const foot=document.createElement('p');
  foot.textContent='同じ保存元の全キーを表示。黄色＝この画面の「ローカルストレージ開放」で消える項目。ほかのキーは消しません。認証情報らしい値は非表示。';
  foot.style.cssText='margin:7px 0 0;color:#d6e3d7;font:10px/1.5 system-ui,-apple-system,sans-serif;';
  const sensitiveKey=key=>/(?:token|oauth|secret|password|passwd|credential|auth|session|bearer|jwt|cookie|api[_:-]?key|private[_:-]?key)/i.test(key);
  const sensitiveValue=value=>/(?:access_token|refresh_token|client_secret|authorization|bearer\s+[a-z0-9._~-]|["'](?:token|secret|password|api[_-]?key|session)["']\s*:)/i.test(value);
  refreshInventory=()=>{
   list.replaceChildren();
   let target=null;
   try{target=reviewKey(getReview());}
   catch(error){/* No active review yet: list all keys without a deletion target. */}
   try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
     const key=localStorage.key(i);
     if(key!==null)keys.push(key);
    }
    keys.sort((a,b)=>a.localeCompare(b));
    const willRemove=target!==null&&keys.includes(target);
    summary.textContent=keys.length+'件保存中 / 開放対象 '+(willRemove?'1件': '0件');
    if(target){
     const targetLine=document.createElement('span');
     targetLine.style.cssText='display:block;margin-top:3px;overflow-wrap:anywhere;color:#ffdf9d;';
     targetLine.textContent='対象キー: '+target+(willRemove?'':'（まだ保存されていません）');
     summary.appendChild(targetLine);
    }
    if(!keys.length){
     const empty=document.createElement('p');
     empty.textContent='localStorageは空です。';
     empty.style.cssText='margin:8px 2px;color:#d9ecdb;font:11px/1.5 system-ui;';
     list.appendChild(empty);
    }
    for(const key of keys){
     const selected=key===target;
     const row=document.createElement('div');
     row.setAttribute('role','listitem');
     row.dataset.releaseTarget=selected?'true':'false';
     row.style.cssText='padding:8px;border:1px solid '+(selected?'#ffbd62':'#6e867d')+
      ';border-radius:8px;background:'+(selected?'rgba(255,176,68,.25)':'rgba(9,29,24,.55)')+
      ';color:#ebf9ee;min-width:0;overflow-wrap:anywhere;';
     const top=document.createElement('div');
     top.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;gap:5px;flex-wrap:wrap;';
     const keyName=document.createElement('code');
     keyName.textContent=key;
     keyName.style.cssText='font:11px/1.45 ui-monospace,monospace;min-width:0;overflow-wrap:anywhere;white-space:normal;';
     top.appendChild(keyName);
     if(selected){
      const mark=document.createElement('strong');
      mark.textContent='開放で削除';
      mark.style.cssText='flex:none;font:700 10px/1.4 system-ui;color:#2d2112;background:#ffd08a;padding:3px 5px;border-radius:5px;';
      top.appendChild(mark);
     }
     row.appendChild(top);
     let value=null;
     try{value=localStorage.getItem(key);}
     catch(error){
      const err=document.createElement('p');
      err.textContent='値を読み取れません: '+String(error?.message||error);
      err.style.cssText='font:10px/1.5 system-ui;color:#ffd08a;margin:5px 0 0;';
      row.appendChild(err);list.appendChild(row);continue;
     }
     const len=value?.length??0;
     const meta=document.createElement('p');
     meta.style.cssText='margin:4px 0 0;color:#c6e0d2;font:10px/1.5 system-ui;';
     meta.textContent='値 '+len.toLocaleString()+'文字';
     row.appendChild(meta);
     if(value!==null){
      if(sensitiveKey(key)||sensitiveValue(value)){
       const hiddenValue=document.createElement('p');
       hiddenValue.textContent='値は非表示（認証情報の可能性）';
       hiddenValue.style.cssText='margin:3px 0 0;color:#ffd08a;font:10px/1.5 system-ui;';
       row.appendChild(hiddenValue);
      }else{
       const details=document.createElement('details');
       details.style.cssText='margin-top:4px;font:11px/1.5 system-ui;';
       const toggle=document.createElement('summary');
       toggle.textContent='保存内容を見る';
       toggle.style.cssText='color:#d1f6e8;cursor:pointer;touch-action:manipulation;';
       const pre=document.createElement('pre');
       pre.style.cssText='margin:5px 0 0;padding:6px;border-radius:5px;background:#081a16;color:#d9f4e6;max-height:160px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:10px/1.5 ui-monospace,monospace;';
       details.append(toggle,pre);
       details.addEventListener('toggle',()=>{
        if(details.open)try{
         const current=localStorage.getItem(key);
         pre.textContent=current===null?'すでに削除されています':
          (sensitiveKey(key)||sensitiveValue(current)?'値は非表示（認証情報の可能性）':current);
        }catch(error){pre.textContent='読み取りに失敗: '+String(error?.message||error);}
        else pre.textContent='';
       });
       row.appendChild(details);
      }
     }
     list.appendChild(row);
    }
   }catch(error){
    summary.textContent='localStorage一覧を読み取れません。';
    const detail=document.createElement('p');
    detail.textContent=String(error?.message||error);
    detail.style.cssText='color:#ffd08a;font:11px/1.5 system-ui;';
    list.appendChild(detail);
   }
  };
  refreshButton.addEventListener('click',refreshInventory);
  inventory.append(header,summary,list,foot);
 }
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
  refreshInventory();
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
 section.append(heading,buttons);
 if(inventory)section.appendChild(inventory);
 section.append(status,help);
 reviewPanel.prepend(section);
 return {section,refreshInventory,clearStatus(){status.textContent='';}};
}
