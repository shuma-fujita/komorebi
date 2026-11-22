// Same-origin localStorage inventory for the fifth Komorebi panel.
// No migration, bulk deletion, OSM API calls, or silent key removal.
import {releaseStoredOsmTagChange} from './maps/osm-pending-changes.js?v=storage-manager-v1-20261122';
const PREFIX='komorebi3d:osm-tag-changes:v2:';
const RE_SHARED=/^(node|way|relation)\/([1-9]\d*)$/;
const sensitiveKey=key=>/(?:token|oauth|secret|password|passwd|credential|auth|session|bearer|jwt|cookie|api[_:-]?key|private[_:-]?key)/i.test(key);
const sensitiveValue=value=>/(?:access_token|refresh_token|client_secret|authorization|bearer\s+[a-z0-9._~-]|["'](?:token|secret|password|api[_-]?key|session)["']\s*:)/i.test(value);
export function keyDescription(key){
 if(key==='komorebi3d-last-world-dev')return '最後に選択したワールド（森・松戸）';
 if(key==='komorebi3d-render-mode-dev')return '前回選択した描画モード（A / B / 比較）';
 if(key==='komorebi3d-osm-test-links-v1')return '本番OSM要素とテストOSMのコピー先IDの対応';
 if(key.startsWith(PREFIX))return '共通OSMタグ変更（osmVersion:null＝動作確認／整数＝本番送信成功）';
 if(key.startsWith('komorebi3d:osm-production-pending:v1:'))return '旧形式：本番OSM送信済みの変更記録（自動移行なし）';
 if(key.startsWith('komorebi3d:osm-review-storage-check:v1:'))return '旧形式：動作確認のタグ変更記録（自動移行なし）';
 return 'サイト内の保存データ（用途はキー名・内容で確認）';
}
export function listLocalStorage(storage=localStorage){
 const keys=[];
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(key!==null)keys.push(key);
 }
 keys.sort((a,b)=>a.localeCompare(b));
 return keys.map(key=>({key,value:storage.getItem(key)}));
}
export function deleteLocalStorageKey(key,expectedValue,storage=localStorage,{release=releaseStoredOsmTagChange}={}){
 if(typeof key!=='string'||!key)throw Error('削除対象キーがありません。');
 const existing=storage.getItem(key);
 if(existing===null)throw Error('このキーは既に削除されています。');
 if(existing!==expectedValue)throw Error('確認後に保存内容が変更されました。一覧を更新してから再確認してください。');
 const suffix=key.startsWith(PREFIX)?key.slice(PREFIX.length):null;
 const match=suffix?.match(RE_SHARED);
 if(match&&storage===localStorage)release(match[1],match[2]);
 else storage.removeItem(key);
 if(storage.getItem(key)!==null)throw Error('削除を確認できませんでした。');
 return {key,osm:match?{type:match[1],id:match[2]}:null};
}
const text=(tag,value,className)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 el.textContent=value;
 return el;
};
// Copy interactions remain mock-only until the user's UI approval.
export function mountLocalStorageManager(doc=document,{copyKeys=false}={}){
 const panel=doc.getElementById('storage-panel');
 if(!panel||panel.dataset.storageMounted==='true')return null;
 panel.dataset.storageMounted='true';
 const filter=panel.querySelector('#storage-filter');
 const clear=panel.querySelector('#storage-filter-clear');
 const refresh=panel.querySelector('#storage-refresh');
 const count=panel.querySelector('#storage-count');
 const entries=panel.querySelector('#storage-entries');
 const feedback=panel.querySelector('#storage-feedback');
 if(!filter||!clear||!refresh||!count||!entries||!feedback)throw Error('localStorage管理パネルの部品が見つかりません。');
 const render=()=>{
  clear.hidden=!filter.value.length;
  entries.replaceChildren();
  let rows;
  try{rows=listLocalStorage();}
  catch(error){
   count.textContent='localStorageを読み取れません。';
   feedback.textContent='⚠ '+String(error.message||error);
   return;
  }
  const q=filter.value.trim().toLocaleLowerCase();
  const visible=rows.filter(item=>item.key.toLocaleLowerCase().includes(q));
  count.textContent='保存済み '+rows.length+'件 / 表示 '+visible.length+'件';
  if(!visible.length){
   entries.appendChild(text('p',rows.length?'一致するキーはありません。':'localStorageにはまだ保存がありません。','storage-entry-empty'));
  }
  for(const item of visible){
   const row=doc.createElement('article');
   row.className='storage-entry';
   row.dataset.key=item.key;
   const osmMatch=item.key.match(/(?:^|:)(node|way|relation)\/([1-9]\d*)$/);
   if(copyKeys){
    const status=text('p','','storage-copy-status');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    status.style.cssText='margin:4px 0;color:#b9f5c8;font-size:11px;';
    const copyButton=(label,value,ariaLabel)=>{
     const button=doc.createElement('button');
     button.type='button';
     button.className='storage-copy-button';
     button.textContent=label;
     button.setAttribute('aria-label',ariaLabel);
     button.title='タップでコピー';
     button.style.cssText='display:block;box-sizing:border-box;max-width:100%;min-height:38px;margin:0 0 5px;padding:7px 9px;border:1px solid #456b51;border-radius:7px;background:#1b3724;color:#d7ffe5;font:700 11px/1.5 ui-monospace,SFMono-Regular,monospace;text-align:left;overflow-wrap:anywhere;white-space:normal;touch-action:manipulation;cursor:pointer;';
     button.addEventListener('click',async()=>{
      try{
       const clipboard=doc.defaultView?.navigator?.clipboard;
       if(typeof clipboard?.writeText!=='function')throw Error('クリップボードを利用できません');
       await clipboard.writeText(value);
       status.textContent='✓ コピーしました：'+value;
      }catch(error){
       status.textContent='⚠ コピーできませんでした。ブラウザのコピー許可を確認してください。';
      }
     });
     return button;
    };
    row.appendChild(copyButton(item.key,item.key,'保存キーをコピー：'+item.key));
    // The canonical and legacy OSM storage keys end in node/ID, way/ID, etc.
    if(osmMatch)row.appendChild(copyButton('OSM ID: '+osmMatch[2]+'  ⧉',osmMatch[2],'OSM ID '+osmMatch[2]+' をコピー'));
    row.appendChild(status);
   }else{
    row.appendChild(text('code',item.key,'storage-entry-key'));
    if(osmMatch){
     const searchButton=text('button','OSM ID: '+osmMatch[2]+'  → 検索','storage-search-id');
     searchButton.type='button';
     searchButton.title='タップしてこのIDで保存キーを検索';
     searchButton.setAttribute('aria-label','OSM ID '+osmMatch[2]+' で検索');
     searchButton.style.cssText='display:block;max-width:100%;min-height:40px;margin:7px 0 4px;padding:7px 10px;border:1px solid #557b5c;border-radius:7px;background:#1b3724;color:#d7ffe5;font:700 11px/1.5 ui-monospace,SFMono-Regular,monospace;text-align:left;overflow-wrap:anywhere;white-space:normal;touch-action:manipulation;cursor:pointer;';
     searchButton.addEventListener('click',()=>{
      filter.value=osmMatch[2];
      feedback.textContent='OSM ID '+osmMatch[2]+' で絞り込みました。';
      render();
     });
     row.appendChild(searchButton);
    }
   }
   row.append(
    text('p',keyDescription(item.key),'storage-entry-about'),
    text('p','値 '+(item.value?.length??0).toLocaleString()+'文字','storage-entry-meta'));
   const details=doc.createElement('details');
   const toggle=text('summary','保存内容を確認');
   const pre=text('pre','');
   details.append(toggle,pre);
   details.addEventListener('toggle',()=>{
    if(!details.open){pre.textContent='';return;}
    try{
     const now=localStorage.getItem(item.key);
     if(now===null)pre.textContent='このキーは削除されています。一覧を更新してください。';
     else if(sensitiveKey(item.key)||sensitiveValue(now))pre.textContent='認証情報を含む可能性があるため値は非表示です。';
     else {
      try{pre.textContent=JSON.stringify(JSON.parse(now),null,2);}
      catch{pre.textContent=now;}
     }
    }catch(error){pre.textContent='読み取りエラー: '+String(error.message||error);}
   });
   row.appendChild(details);
   const remove=text('button','このキーを削除','storage-delete');
   remove.type='button';
   const ask=doc.createElement('div');
   ask.className='storage-confirm';
   ask.hidden=true;
   const prompt=text('p','以下のキーを削除します。元に戻せません。');
   const keyLine=text('code',item.key,'storage-entry-key');
   const actions=doc.createElement('div');
   actions.className='storage-confirm-actions';
   const cancel=text('button','キャンセル');
   cancel.type='button';
   const confirm=text('button','このキーを削除する','storage-confirm-delete');
   confirm.type='button';
   cancel.addEventListener('click',()=>{ask.hidden=true;remove.hidden=false;});
   remove.addEventListener('click',()=>{ask.hidden=false;remove.hidden=true;feedback.textContent='';});
   confirm.addEventListener('click',()=>{
    try{
     const result=deleteLocalStorageKey(item.key,item.value);
     doc.defaultView?.dispatchEvent(new CustomEvent('komorebi:local-storage-deleted',{detail:result}));
     feedback.textContent='✅ '+item.key+' を削除しました。';
     render();
    }catch(error){
     feedback.textContent='⚠ '+String(error.message||error);
     render();
    }
   });
   actions.append(cancel,confirm);
   ask.append(prompt,keyLine,actions);
   row.append(remove,ask);
   entries.appendChild(row);
  }
 };
 const refreshView=()=>{feedback.textContent='';render();};
 filter.addEventListener('input',()=>{feedback.textContent='';render();});
 clear.addEventListener('click',()=>{
  filter.value='';
  feedback.textContent='';
  render();
  filter.focus();
 });
 refresh.addEventListener('click',refreshView);
 panel.addEventListener('komorebi:panel-shown',render);
 doc.defaultView?.addEventListener('storage',render);
 doc.defaultView?.addEventListener('komorebi:local-storage-mutated',render);
 doc.defaultView?.addEventListener('focus',render);
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)render();});
 render();
 return {refresh:render};
}
