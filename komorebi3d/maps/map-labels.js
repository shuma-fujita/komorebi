// Project building and ground-level POI labels using shared A/B viewport camera information.
import {OSM_TEST_ORIGIN,hasOsmTestToken,forgetOsmTestToken,consumeOsmTestAuthError,startOsmTestLogin,finishOsmTestLogin,getOsmTestElement,validateOsmTestLevelTarget,sendOsmTestLevel,loadOsmCopySource,createOsmTestCopy} from './osm-test-api.js?v=lazy-oauth-config-20261121';
import {getOsmTestLink,saveOsmTestLink} from './osm-test-links.js?v=osm-test-links-20261120';
import {attachSheetMotion} from './sheet-motion.js?v=tag-focus-scroll-only-20261121';
import {attachEditorKeyboardLayout} from './editor-keyboard-layout.js?v=native-keyboard-scroll-only-20261121';
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from './building-editor-layout.js?v=ratio-centered-20261121';
import {guardSheetScroll} from './sheet-scroll-guard.js?v=ios-scroll-containment-20261120';
import {attachBuildingPreviewGestures} from './building-preview-gestures.js?v=tap-toggle-orbit-20261121';
import {applyBuildingTagEditorTheme} from './building-tag-editor-theme.js?v=copy-auth-error-under-action-20261121';
import {getPendingOsmTagChange,getAllPendingOsmTagChanges} from './osm-pending-changes.js?v=live-overlay-step2-20261122';
import {applyPendingTagVisualStyle,syncPendingTagRows,PENDING_GEOFABRIK_LABEL} from './osm-pending-tag-visual.js?v=step3-mock-20261122';
import {loadOsmTagOrder,orderOsmTagEntries} from './osm-tag-order.js?v=priority-display-20261121';
const osmTestOAuthReturn=finishOsmTestLogin();
import {pickFocusedBuilding,pickBuildingAtScreen} from './map-focus.js?v=tap-unlimited-20261119';
import {shopsInFocusedBuilding} from './map-occupants.js?v=shared-outside-1m-20261119';

export function createMapLabels(host,{screen=null,mapSource='old',onEditorStateChange=null,onEditorPreviewGesture=null,onEditorDraftChange=null}={}){
 const layer=document.createElement('div');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3';
 host.appendChild(layer);
 const viewports=[...host.querySelectorAll('.view-panel > canvas')].map((canvas,i)=>({canvas,screen:i===0?'A':'B',items:[]})).filter(viewport=>screen===null||viewport.screen===screen);
 let entries=[];
 let buildings=[];
 // Tenant warning IDs are snapshotted on layer creation and on confirmed
 // production saves. Do not query browser storage during animation frames.
 let pendingTenantKeys=new Set();
 function refreshPendingTenants(){
  if(mapSource!=='new'){pendingTenantKeys=new Set();return;}
  try{
   pendingTenantKeys=new Set(getAllPendingOsmTagChanges()
    .map(entry=>entry.type+'/'+entry.id));
  }catch(error){
   console.warn('OSMテナント反映待ちの読み取り失敗',error);
   pendingTenantKeys=new Set();
  }
 }
 refreshPendingTenants();
 const tenantIsPending=shop=>mapSource==='new'&&
  pendingTenantKeys.has(shop.osmType+'/'+shop.osmId);
 let cachedShops=[],lastShopKey=null,shopIndexDirty=true;
 function shopsForFocus(key){
  if(shopIndexDirty||lastShopKey!==key){
   cachedShops=shopsInFocusedBuilding(buildings,entries,key);
   shopIndexDirty=false;lastShopKey=key;
  }
  return cachedShops;
 }
 let focusedKey=null,focusedHit=null,pendingKey=null,pendingSince=0,lastFocusAt=-Infinity;
 let tappedBuilding=null,lastCamera=null;
 // A blank-space tap or second tap of the same building suppresses ALL
 // camera-driven tags until a building is explicitly tapped again.
 let tagHidden=false;
 function displayedSelection(){
  if(tagHidden)return {key:null,hitPoint:null};
  return tappedBuilding?{key:tappedBuilding.key,hitPoint:tappedBuilding.hitPoint}:
   {key:focusedKey,hitPoint:focusedHit};
 }
 function setTagHidden(value){
  tagHidden=Boolean(value);
  if(tagHidden){
   tappedBuilding=null;
   for(const viewport of viewports)
    if(viewport.summary?.el)viewport.summary.el.style.display='none';
   debugSvg.replaceChildren();
  }
 }
 function isTagHidden(){return tagHidden;}

 function appendBuildingFeatures(features){
  if(!features?.length)return;
  for(const feature of features)if(feature.type==='building'&&feature.osmId!=null)buildings.push(feature);
  lastFocusAt=-Infinity;shopIndexDirty=true;
 }
 function setBuildingFeatures(features){
  buildings=[];
  focusedKey=null;focusedHit=null;pendingKey=null;pendingSince=0;
  tappedBuilding=null;
  appendBuildingFeatures(features);
 }
 let debugAnchors=false;
 const debugSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 debugSvg.setAttribute('aria-hidden','true');
 debugSvg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;display:block';
 layer.appendChild(debugSvg);
 function setDebugAnchors(value){
  debugAnchors=Boolean(value);
  // Keep the connector visible; show extra OSM IDs only in debug mode.
 }
 function drawDebugAnchor(item,rect,hostRect,x,y,labelX,labelY){
  const ns='http://www.w3.org/2000/svg',ox=rect.left-hostRect.left,oy=rect.top-hostRect.top;
  const element=(tag,attrs)=>{
   const node=document.createElementNS(ns,tag);
   for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
   return node;
  };
  const ax=ox+x,ay=oy+y,sx=ox+labelX,sy=oy+labelY;
  debugSvg.appendChild(element('line',{x1:sx,y1:sy,x2:ax,y2:ay,stroke:'#7bead8','stroke-width':1.5}));
  debugSvg.appendChild(element('circle',{cx:ax,cy:ay,r:3.5,fill:'#7bead8',stroke:'rgba(23,40,56,.45)','stroke-width':2}));
  if(!debugAnchors)return;
  const right=ax+85>ox+rect.width;
  const text=element('text',{x:right?ax-8:ax+8,y:Math.max(oy+12,ay-8),'text-anchor':right?'end':'start',fill:'#fff5a8','font-size':10,'font-weight':700,stroke:'#14251d','stroke-width':3,'paint-order':'stroke'});
  text.textContent=(item.kind==='building'?'building':'poi')+' '+item.osmType+'/'+item.osmId;
  debugSvg.appendChild(text);
 }

 // JSON edit/confirm, with strictly isolated OSM development-server level test.
 let editor=null,editorMotion=null,editorScrollGuard=null,editorPreviewGestures=null,editorKeyboardLayout=null,previewActive=false;
 let refreshEditorPending=null;
 function setPreviewActive(value){
  previewActive=Boolean(value);
  // The OSM label layer is independent from the editor mask (a host child).
  // Hide the entire layer, including previously created neon-tag items,
  // for BOTH A/B viewports while the isolated building preview is active.
  layer.style.display=previewActive?'none':'';
  if(previewActive){
   for(const viewport of viewports)if(viewport.summary?.el)viewport.summary.el.style.display='none';
   debugSvg.replaceChildren();
  }
 }
 function closeEditor(){
  refreshEditorPending=null;
  if(!editor)return;
  editorMotion?.destroy();editorMotion=null;
  editorKeyboardLayout?.destroy();editorKeyboardLayout=null;
  editorScrollGuard?.destroy();editorScrollGuard=null;
  editorPreviewGestures?.destroy();editorPreviewGestures=null;
  editor.remove();editor=null;
  onEditorStateChange?.(false);
 }
 function openEditor(item){
  if(!item.osmType||!item.osmId)return;
  closeEditor();
  const baseTags={...(item.originalTags||item.tags||{})};
  const initial={...baseTags};
  const editTarget={osmType:item.osmType,osmId:item.osmId};
  const tagOrderPromise=loadOsmTagOrder();
  let tagOrderRules=[];
  const mask=document.createElement('div');
  mask.style.cssText='position:absolute;inset:0;z-index:12;display:flex;align-items:flex-end;justify-content:center;padding:0;background:rgba(8,18,25,.18);pointer-events:auto;';
  // Gesture surface covers only the visible upper-half building preview.
  // The bottom sheet retains its native scroll and separate dismissal grip.
  const previewTouch=document.createElement('div');
  previewTouch.setAttribute('role','group');
  previewTouch.setAttribute('aria-label','ビルの3Dプレビュー：タップで自動回転の停止・再開、左右スワイプで水平回転、2本指ピンチで拡大縮小');
  previewTouch.style.cssText='position:absolute;top:0;left:0;right:0;height:'+(BUILDING_PREVIEW_RATIO*100)+'%;z-index:1;touch-action:none;overscroll-behavior:none;user-select:none;-webkit-user-select:none;pointer-events:auto;';
  editorPreviewGestures=attachBuildingPreviewGestures(previewTouch,state=>onEditorPreviewGesture?.(state));
  const form=document.createElement('form');
  form.style.cssText='box-sizing:border-box;width:100%;height:'+(BUILDING_SHEET_RATIO*100)+'%;max-height:'+(BUILDING_SHEET_RATIO*100)+'%;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:0 16px max(18px,env(safe-area-inset-bottom));background:#f8fcfa;color:#18352f;border-radius:18px 18px 0 0;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 -10px 35px #06140d66;';
  const handle=document.createElement('div');
  handle.setAttribute('role','button');
  handle.setAttribute('aria-label','上にスワイプで全画面、下にスワイプで半画面または閉じる');
  handle.setAttribute('tabindex','0');
  handle.style.cssText='position:sticky;top:0;z-index:5;box-sizing:border-box;height:36px;margin:0 -16px 6px;padding:0 16px;display:flex;align-items:center;justify-content:center;background:#152c26;border-radius:18px 18px 0 0;touch-action:none;overscroll-behavior:none;cursor:grab;user-select:none;-webkit-user-select:none;';
  const grip=document.createElement('span');
  grip.className='komo-grip';
  grip.style.cssText='display:block;width:44px;height:5px;border-radius:99px;background:#a9b8b0;pointer-events:none;';
  handle.appendChild(grip);
  handle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();editorMotion?.toggle();}else if(event.key==='Escape'){event.preventDefault();closeEditor();}});
  // Motion controller owns grip dragging, fling velocity and sheet transitions.
  editorMotion=attachSheetMotion(form,handle,closeEditor);
  form.appendChild(handle);
  const title=document.createElement('h3');
  title.textContent=item.name||'OSMの建物';
  const subtitle=document.createElement('p');
  subtitle.className='komo-editor-subtitle';
  subtitle.textContent=item.kind==='building'?'建物（OSMタグ）':'店舗・施設（OSMタグ）';
  const titleWrap=document.createElement('div');
  titleWrap.className='komo-editor-heading';
  titleWrap.append(title,subtitle);
  const header=document.createElement('div');
  header.className='komo-editor-header';
  const copyButton=document.createElement('button');
  copyButton.type='button';copyButton.textContent='テスト環境へコピー';
  copyButton.className='komo-editor-copy';
  const closeIcon=document.createElement('button');
  closeIcon.type='button';closeIcon.className='komo-editor-close';
  closeIcon.textContent='×';closeIcon.setAttribute('aria-label','編集画面を閉じる');
  closeIcon.addEventListener('click',closeEditor);
  header.append(titleWrap,copyButton,closeIcon);
  const copyPane=document.createElement('section');
  copyPane.hidden=true;
  copyPane.className='komo-copy-pane';
  copyPane.style.cssText='padding:10px;margin:8px 0;background:#edf4ee;border:1px solid #9db7a9;border-radius:9px;';
  const copyInfo=document.createElement('p');
  copyInfo.style.cssText='font-size:12px;margin:2px 0 9px;';
  copyInfo.textContent='本番OSMから読み取り、元のタグと位置をテストサーバーへ新規コピーします。本番のデータは変更しません。コピー済みの場合は同じテストIDを再利用します。';
  const copyPreview=document.createElement('pre');
  copyPreview.hidden=true;
  copyPreview.style.cssText='max-height:22vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px;border-radius:6px;background:#fff;color:#173d2e;font:12px/1.5 ui-monospace,monospace;';
  const copyStatus=document.createElement('p');
  copyStatus.style.cssText='font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:#345849;';
  const decorateStatus=(el)=>{
   el.classList.add('komo-osm-feedback');
   const update=()=>{
    const message=el.textContent.trim();
    const isError=/^(?:読み込み失敗|テスト送信失敗|コピー作成エラー|コピー準備エラー|認証開始エラー|認証失敗|テストAPI HTTP)/.test(message);
    el.dataset.statusKind=isError?'error':'normal';
   };
   new MutationObserver(update).observe(el,{childList:true,characterData:true,subtree:true});
   update();
  };
  decorateStatus(copyStatus);
  const copyAuth=document.createElement('button');copyAuth.type='button';copyAuth.textContent='テスト環境へログイン';
  const copyConsentLabel=document.createElement('label');
  copyConsentLabel.style.cssText='display:block;margin:9px 0;font-size:12px;';
  const copyConsent=document.createElement('input');copyConsent.type='checkbox';
  copyConsentLabel.append(copyConsent,document.createTextNode(' この実在データをテスト環境へ複製することを確認した'));
  const copyExecute=document.createElement('button');copyExecute.type='button';copyExecute.textContent='確認してコピーを作成';
  const copyBtnStyle='padding:9px 10px;margin:4px 4px 4px 0;border-radius:7px;border:1px solid #91aca0;background:#fff;color:#163c30;font:700 12px system-ui;';
  copyAuth.style.cssText=copyBtnStyle;
  copyExecute.style.cssText=copyBtnStyle+'background:#236c56;color:white;';
  copyExecute.disabled=false;
  // Show actionable OAuth failures directly below the copy action, using
  // the same red feedback treatment as a failed test-OSM submission.
  const copyActionError=document.createElement('p');
  copyActionError.className='komo-osm-feedback';
  copyActionError.dataset.statusKind='error';
  copyActionError.hidden=true;
  copyActionError.setAttribute('role','alert');
  const clearCopyActionError=()=>{copyActionError.hidden=true;copyActionError.textContent='';};
  const copySuccess=document.createElement('div');
  copySuccess.hidden=true;
  // Same green palette as the selected Matsudo world button.
  copySuccess.style.cssText='box-sizing:border-box;width:100%;margin:9px 0 0;padding:12px;border:1px solid #64956c;border-radius:9px;background:#d9ebd5;color:#31563b;font:13px/1.6 system-ui;overflow-wrap:anywhere;';
  const copySuccessText=document.createElement('div');
  copySuccessText.style.cssText='font-weight:700;white-space:pre-wrap;';
  const copyResult=document.createElement('div');
  copyResult.style.cssText='margin-top:7px;font-size:12px;';
  copySuccess.append(copySuccessText,copyResult);
  copyPane.append(copyInfo,copyPreview,copyStatus,copyAuth,copyConsentLabel,copyExecute,copyActionError,copySuccess);
  const savedTestLink=getOsmTestLink(item.osmType,String(item.osmId));
  let linkedTestTarget=savedTestLink;
  let copySource=null,copyBusy=false,copyCreated=Boolean(savedTestLink);
  if(savedTestLink){
   copyButton.textContent='コピー済み';
   copyStatus.textContent='テスト環境にコピー済みです。テストID '+savedTestLink.type+'/'+savedTestLink.id+' を再利用できます。';
  }
  const refreshCopyButtons=()=>{
   copyButton.disabled=copyBusy;
   copyAuth.textContent=hasOsmTestToken()?'テスト環境へ再ログイン':'テスト環境へログイン';
   copyExecute.disabled=copyBusy||copyCreated;
   copyExecute.style.opacity=copyExecute.disabled?'0.55':'1';
  };
  copyButton.addEventListener('click',async()=>{
   if(copyBusy)return;
   copyPane.hidden=!copyPane.hidden;
   if(copyPane.hidden||copySource||copyCreated)return;
   copyBusy=true;copyStatus.textContent='コピー元を本番OSMから読み取り中…';refreshCopyButtons();
   try{
    await osmTestOAuthReturn;
    const source=await loadOsmCopySource(item.osmType,item.osmId);
    copySource=source;
    copyPreview.hidden=false;
    copyPreview.textContent=JSON.stringify({
     source:'本番OpenStreetMap（読み取り専用）',
     type:source.type,id:source.id,name:source.tags.name||source.tags['name:ja']||item.name,
     nodes:source.nodes,geometry:source.type==='way'?'輪郭ノードもコピー':'店舗ノード',
     tags:source.tags
    },null,2);
    copyStatus.textContent='コピー元を確認してください。コピー先はテスト環境です。新しいIDが発行されます。';
   }catch(e){copyStatus.textContent='コピー準備エラー: '+e.message;}
   finally{copyBusy=false;refreshCopyButtons();if(copySource&&!copyCreated&&!hasOsmTestToken())copyStatus.textContent+='\n※ テストサイトにログイン済みでも、KomorebiからのOAuth認証は別途必要です。';}
  });
  copyAuth.addEventListener('click',async()=>{
   clearCopyActionError();
   try{await startOsmTestLogin();}catch(e){copyStatus.textContent='認証開始エラー: '+e.message;}
  });
  copyConsent.addEventListener('change',refreshCopyButtons);
  copyExecute.addEventListener('click',async()=>{
   if(copyBusy||copyCreated)return;
   clearCopyActionError();
   if(!copySource){copyStatus.textContent='まだコピー元を取得できていません。上の「テスト環境へコピー」を開き直して、コピー元データが表示されるか確認してください。';return;}
   if(!hasOsmTestToken()){
    copyActionError.textContent='Komorebi側のOAuth認証が未完了です。「テスト環境へログイン」を押して認証してください。';
    copyActionError.hidden=false;
    return;
   }
   if(!copyConsent.checked){copyStatus.textContent='コピー元の内容を確認して、実際にテスト環境へ複製するチェックを入れてください。';return;}
   copyBusy=true;copyStatus.textContent='テストサーバーへコピー作成中…';refreshCopyButtons();
   try{
    const result=await createOsmTestCopy(copySource);
    copyCreated=true;
    const saved=saveOsmTestLink(item.osmType,String(item.osmId),result.type,result.id);
    linkedTestTarget={type:result.type,id:String(result.id)};
    copyButton.textContent='コピー済み';
    copyStatus.textContent=saved?'':'※ IDの端末保存に失敗しました。今回のIDを控えてください。';
    copySuccessText.textContent='✅ コピー完了！\nテスト用 '+result.type+'/'+result.id+'\nchangeset '+result.changesetId;
    copySuccess.hidden=false;
    const anchor=document.createElement('a');anchor.href=result.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent='テスト環境でコピーを見る';
    copyResult.appendChild(anchor);
    // The existing level edit panel can use this new ID immediately.
    targetType.value=result.type;targetId.value=result.id;
    loaded=null;testDetails.hidden=true;syncTestControls();
    testTags=null;testDraft=null;
    await setSource('test');
   }catch(e){copySuccess.hidden=true;copyStatus.textContent='コピー作成エラー: '+e.message;}
   finally{copyBusy=false;refreshCopyButtons();}
  });
  const note=document.createElement('p');
  note.className='komo-status';
  note.textContent='本番OSMは読み取り専用です。テスト側ではタグを追加・確認できます。実際のテストOSMへの送信は、現在level追加のみ対応しています。';
  const metadata=document.createElement('p');
  metadata.textContent='OSM '+item.osmType+'/'+item.osmId+' ／ version: '+(item.osmVersion??'未取得');
  metadata.style.cssText='font-size:11px;color:#587166;margin:4px 0;';
  const rows=document.createElement('div');
  rows.setAttribute('aria-label','OSMタグ一覧');
  const inputStyle='box-sizing:border-box;width:100%;min-width:0;padding:8px;border:1px solid #aabfb5;border-radius:7px;background:white;color:#152b25;font:16px/1.4 system-ui,-apple-system,sans-serif;';
  function addRow(key='',value='',editable=false){
   const row=document.createElement('div');row.className='komo-tag-row';
   const k=document.createElement('input');k.value=key;k.placeholder='タグ名';
   k.setAttribute('aria-label','タグ名');k.style.cssText=inputStyle;
   k.readOnly=!editable||Boolean(key);
   const v=document.createElement('input');v.value=value;v.placeholder='値';
   v.setAttribute('aria-label','タグの値');v.style.cssText=inputStyle;
   v.readOnly=!editable;
   // Existing OSM keys cannot be renamed. Tapping the key focuses its value
   // immediately so a single tap opens the iPhone software keyboard.
   if(key&&editable)k.addEventListener('click',()=>v.focus({preventScroll:true}));
   row.append(k,v);rows.appendChild(row);
  }
  const tagsHeader=document.createElement('p');
  tagsHeader.textContent='タグ';
  tagsHeader.className='komo-caption';
  tagsHeader.style.cssText='font-weight:700;margin:12px 0 4px;';
  const add=document.createElement('button');add.type='button';add.textContent='＋ タグを追加';
  add.className='komo-add-tag';
  add.addEventListener('click',()=>{addRow('','',true);rows.lastElementChild?.firstElementChild?.focus({preventScroll:true});});
  const error=document.createElement('p');
  error.style.cssText='color:#a52f2f;font-size:12px;min-height:1em;';
  const review=document.createElement('div');review.hidden=true;review.className='komo-review';
  const previewTitle=document.createElement('p');previewTitle.textContent='JSON変更内容の確認（OSM未送信）';previewTitle.style.fontWeight='700';
  const json=document.createElement('pre');json.style.cssText='max-height:40vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#e8f0eb;border-radius:8px;color:#19352f;font:12px/1.5 ui-monospace,monospace;';
  review.append(previewTitle,json);

  const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;margin-top:12px;';
  const makeButton=(label,primary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='flex:1;padding:11px 5px;border:1px solid #91aca0;border-radius:8px;background:'+(primary?'#236c56':'#fff')+';color:'+(primary?'white':'#163c30')+';font:700 14px system-ui;';return b;};
  // This block is available only to a real-world facility with no level tag.
  // Development server objects must be explicitly loaded by their own ID.
  const eligible=item.kind==='poi'&&['shop','amenity','office','tourism','healthcare','leisure'].some(key=>baseTags[key])&&!Object.prototype.hasOwnProperty.call(baseTags,'level');
  const testPane=document.createElement('div');
  testPane.hidden=true;
  testPane.style.cssText='margin-top:12px;border-top:1px solid #b4c9bb;padding-top:12px;';
  const testHeading=document.createElement('strong');testHeading.textContent='OSMテストサーバーへ送信（本番には送信しません）';
  const testHelp=document.createElement('p');
  testHelp.textContent='本番の店舗IDは利用できません。テストサーバーにある階数未登録の店舗・施設IDを入力してください。送信対象はlevelタグのみです。';
  testHelp.style.cssText='font-size:12px;color:#4e655b;';
  const testField=(captionText,placeholder,value='')=>{
   const wrap=document.createElement('label');wrap.style.cssText='display:block;font-size:12px;font-weight:700;margin:8px 0;';
   const label=document.createElement('span');label.textContent=captionText;label.style.display='block';
   const input=document.createElement('input');input.value=value;input.placeholder=placeholder;input.style.cssText=inputStyle;
   wrap.append(label,input);testPane.appendChild(wrap);return input;
  };
  const oauth=makeButton('テスト環境にログイン');
  const logout=makeButton('認証を解除');
  const targetType=document.createElement('select');targetType.style.cssText=inputStyle;
  for(const type of ['node','way','relation']){const option=document.createElement('option');option.value=type;option.textContent=type;targetType.appendChild(option);}
  const typeLabel=document.createElement('label');typeLabel.style.cssText='display:block;font-size:12px;font-weight:700;margin:8px 0;';typeLabel.textContent='テスト対象の要素種別';
  typeLabel.appendChild(targetType);
  const targetId=testField('テストサーバーの店舗・施設ID','4365808698 または node/4365808698',savedTestLink?.id||'');
  if(savedTestLink)targetType.value=savedTestLink.type;
  const loadTarget=makeButton('テスト対象を読み込む');
  const testDetails=document.createElement('pre');
  testDetails.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,monospace;background:#e8f0eb;border-radius:7px;padding:8px;';
  testDetails.hidden=true;
  const consentLabel=document.createElement('label');consentLabel.style.cssText='display:block;margin-top:10px;font-size:12px;';
  const consent=document.createElement('input');consent.type='checkbox';
  consentLabel.append(consent,document.createTextNode(' テストサーバーの対象要素を実際に更新することを確認した'));
  const send=makeButton('テストサーバーへ送信',true);
  send.disabled=true;
  const testStatus=document.createElement('p');
  decorateStatus(testStatus);
  let loaded=null,levelValue=null,busy=false;
  const syncTestControls=()=>{
   oauth.textContent=hasOsmTestToken()?'再認証する':'テスト環境にログイン';
   send.disabled=busy||!hasOsmTestToken()||!loaded||!consent.checked||levelValue===null;
   loadTarget.disabled=busy;
  };
  oauth.addEventListener('click',async()=>{
   try{await startOsmTestLogin();}catch(e){testStatus.textContent='認証開始エラー: '+e.message;}
  });
  logout.addEventListener('click',()=>{forgetOsmTestToken();testStatus.textContent='テスト用認証を解除しました。';syncTestControls();});
  async function loadTest(){
   loaded=null;testDetails.hidden=true;syncTestControls();busy=true;
   try{
    await osmTestOAuthReturn;
    const data=await getOsmTestElement(targetType.value,targetId.value.trim());
    targetType.value=data.type;targetId.value=data.id;
    validateOsmTestLevelTarget(data);
    loaded=data;
    testDetails.hidden=false;
    testDetails.textContent=JSON.stringify({server:OSM_TEST_ORIGIN,type:data.type,id:data.id,version:data.version,name:data.tags.name||data.tags['name:ja']||'名称なし',shop:data.tags.shop||null,amenity:data.tags.amenity||null,oldLevel:'未登録',newLevel:String(levelValue)},null,2);
    testStatus.textContent='テスト対象を確認してください。名前が想定と異なる場合は送信しないでください。';
   }catch(e){testStatus.textContent='読み込み失敗: '+e.message;}
   finally{busy=false;syncTestControls();}
  }
  loadTarget.addEventListener('click',loadTest);
  targetType.addEventListener('change',()=>{loaded=null;testDetails.hidden=true;syncTestControls();});
  targetId.addEventListener('input',()=>{loaded=null;testDetails.hidden=true;syncTestControls();});
  consent.addEventListener('change',syncTestControls);
  send.addEventListener('click',async()=>{
   if(!loaded||levelValue===null||!consent.checked||busy)return;
   busy=true;syncTestControls();testStatus.textContent='テストサーバーへ送信中…';
   try{
    const result=await sendOsmTestLevel(loaded,levelValue);
    testStatus.textContent='テスト送信成功！ changeset: '+result.changesetId+' / 新version: '+result.newVersion;
    const resultLink=document.createElement('a');resultLink.href=result.elementUrl;resultLink.target='_blank';resultLink.rel='noopener noreferrer';resultLink.textContent='テスト環境で更新された要素を見る';
    testStatus.append(document.createTextNode('\n'),resultLink);
    loaded=null;consent.checked=false;
   }catch(e){testStatus.textContent='テスト送信失敗: '+e.message+'。本番OSMへの送信は行っていません。';}
   finally{busy=false;syncTestControls();}
  });
  testPane.append(testHeading,testHelp,oauth,logout,typeLabel,targetId.parentElement,loadTarget,testDetails,consentLabel,send,testStatus);
  review.appendChild(testPane);

  const confirm=makeButton('変更内容を確認',true),back=makeButton('編集に戻る');
  confirm.className='komo-action';back.className='komo-action komo-action-secondary';
  confirm.hidden=true;
  let activeSource='production',testTags=null,testDraft=null,productionDraft=null,testReady=false,sourceRequest=0;
  // Only production OSM tags from the NEW Geofabrik map can be pending.
  // A test OSM copy or an unsaved draft must never acquire this warning.
  function refreshPendingTags(){
   let pending=null;
   if(mapSource==='new'&&activeSource==='production'){
    try{pending=getPendingOsmTagChange(item.osmType,String(item.osmId));}
    catch(error){console.warn('OSM反映待ちの読み取り失敗',error);}
   }
   syncPendingTagRows(rows,{pending,mapSource,dataSource:activeSource});
  }
  refreshEditorPending=refreshPendingTags;
  const sourceRow=document.createElement('div');
  sourceRow.style.cssText='display:flex;align-items:center;gap:10px;margin:13px 0;';
  const sourceHeading=document.createElement('strong');sourceHeading.textContent='表示データ';
  sourceHeading.style.cssText='flex:none;font:700 13px system-ui;';
  const sourceSwitch=document.createElement('div');sourceSwitch.className='komo-source-switch';
  sourceSwitch.setAttribute('role','group');sourceSwitch.setAttribute('aria-label','表示するOSMデータ');
  const sourceButtons={};
  for(const [id,label] of [['production','本番OSM'],['test','テストOSM']]){
   const button=document.createElement('button');button.type='button';
   button.textContent=label;button.setAttribute('aria-pressed','false');
   button.addEventListener('click',()=>setSource(id));
   sourceButtons[id]=button;sourceSwitch.appendChild(button);
  }
  sourceRow.append(sourceHeading,sourceSwitch);
  const sourceStatus=document.createElement('p');sourceStatus.className='komo-status';
  sourceStatus.setAttribute('role','status');
  const captureDraft=()=>{
   const values={};
   for(const row of rows.children){
    const key=row.children[0]?.value.trim();
    if(key)values[key]=row.children[1]?.value??'';
   }
   return values;
  };
  const isEdited=()=>{
   if(activeSource!=='test'||!testReady||!testTags)return false;
   const draft=captureDraft();
   return Object.keys(draft).some(key=>draft[key]!==testTags[key])||
    Object.keys(testTags).some(key=>!Object.prototype.hasOwnProperty.call(draft,key));
  };
  function emitPreviewDraft(){
   if(!editor||review.hidden===false)return;
   const tags=captureDraft();
   // An unfinished name/value pair must not be applied to the preview.
   // Preserve any previously existing value until the replacement is complete.
   const original=activeSource==='test'?(testTags||baseTags):baseTags;
   for(const row of rows.children){
    const key=row.children[0]?.value.trim()||'';
    if(!key)continue;
    if(!(row.children[1]?.value??'').trim()){
     if(Object.prototype.hasOwnProperty.call(original,key))tags[key]=original[key];
     else delete tags[key];
    }
   }
   onEditorDraftChange?.({...editTarget,tags,source:activeSource});
  }
  function updateConfirm(){confirm.hidden=!isEdited()||!review.hidden;}
  rows.addEventListener('input',()=>{updateConfirm();emitPreviewDraft();});
  add.addEventListener('click',()=>{updateConfirm();});
  const renderTags=(tags,editable)=>{
   rows.replaceChildren();
   for(const [key,value] of orderOsmTagEntries(tags,tagOrderRules))addRow(key,String(value),editable);
   tagsHeader.textContent='◇ タグ（'+Object.keys(tags).length+'件）';
   add.hidden=!editable;
   updateConfirm();
   refreshPendingTags();
   if(editable)emitPreviewDraft();
  };
  async function setSource(source){
   if(source!=='production'&&source!=='test')return;
   if(!review.hidden)back.click();
   if(activeSource==='test'&&testReady)testDraft=captureDraft();
   if(activeSource==='production'&&rows.children.length)productionDraft=captureDraft();
   activeSource=source;
   // While the new source's tags are loading, the rows still belong to the
   // previous source. Clear highlights first; only renderTags may reapply them.
   syncPendingTagRows(rows,{pending:null,mapSource,dataSource:activeSource});
   const request=++sourceRequest;
   for(const [name,button] of Object.entries(sourceButtons))
    button.setAttribute('aria-pressed',String(name===source));
   sourceStatus.textContent='タグ表示順を読み込み中…';
   tagOrderRules=await tagOrderPromise;
   if(request!==sourceRequest||!editor)return;
   if(source==='production'){
    testReady=false;
    renderTags(productionDraft??baseTags,true);
    add.hidden=true;
    sourceStatus.textContent='本番OSMのタグを表示中。値はここで入力して試せますが、本番への送信・保存は行いません。実際の編集はテストOSMで行ってください。';
    return;
   }
   if(!linkedTestTarget){
    testReady=false;renderTags({},false);
    sourceStatus.textContent='テストOSMにコピーがまだありません。右上の「テスト環境へコピー」で複製してください。';
    return;
   }
   testReady=false;renderTags({},false);
   sourceStatus.textContent='テストOSMから実際のタグを読み込み中…';
   try{
    await osmTestOAuthReturn;
    const data=await getOsmTestElement(linkedTestTarget.type,linkedTestTarget.id);
    if(request!==sourceRequest||!editor)return;
    testTags={...data.tags};
    testReady=true;
    renderTags(testDraft??testTags,true);
    sourceStatus.textContent='テストOSM '+data.type+'/'+data.id+' を表示中。変更の送信は現在levelタグの追加だけに対応しています。';
   }catch(error){
    if(request!==sourceRequest||!editor)return;
    testReady=false;renderTags({},false);
    sourceStatus.textContent='テストOSMの読み込み失敗：'+error.message+'。本番OSMのタグは代わりに表示しません。';
   }
  }
  function collect(){
   if(activeSource!=='test'||!testReady||!testTags||!linkedTestTarget)throw Error('テストOSMのタグを読み込んでから編集してください。');
   const tags={};
   for(const row of rows.children){
    const k=row.children[0].value.trim(),v=row.children[1].value;
    if(!k){if(v.trim())throw Error('タグ名が空欄です');continue;}
    if(Object.prototype.hasOwnProperty.call(tags,k))throw Error('タグ名が重複しています: '+k);
    if(/[\u0000-\u001f=]/.test(k))throw Error('タグ名に使用できない文字が含まれています');
    tags[k]=v;
   }
   const changed={};
   for(const key of new Set([...Object.keys(testTags),...Object.keys(tags)])){
    if(testTags[key]!==tags[key])changed[key]=Object.prototype.hasOwnProperty.call(tags,key)?tags[key]:null;
   }
   if(Object.keys(changed).some(key=>changed[key]===null))throw Error('タグ削除には対応していません。');
   return {osm:{type:linkedTestTarget.type,id:String(linkedTestTarget.id),version:null},tags,changes:changed};
  }
  let pending=null;
  confirm.addEventListener('click',()=>{
   try{
    pending=collect();error.textContent='';
    json.textContent=JSON.stringify({osm:pending.osm,changes:pending.changes,tags:pending.tags},null,2);
    rows.hidden=true;add.hidden=true;tagsHeader.hidden=true;review.hidden=false;
    sourceRow.hidden=true;sourceStatus.hidden=true;note.hidden=true;
    testPane.hidden=!eligible;
    loaded=null;consent.checked=false;testDetails.hidden=true;
    levelValue=null;
    if(eligible&&Object.keys(pending.changes).length===1&&Object.prototype.hasOwnProperty.call(pending.changes,'level')&&/^(?:[0-8])$/.test(String(pending.tags.level))){
     levelValue=Number(pending.tags.level);
     testStatus.textContent='準備OK: level='+levelValue+'。'+(savedTestLink?'コピー済みのテストIDを入力済みです。':'初回は上部の「テスト環境へコピー」から複製してください。')+' 認証後、テスト対象を読み込んでください。';
    }else if(eligible){
     testStatus.textContent='テスト送信には、追加する変更を level=0〜8 の1項目だけにしてください（1階は0）。';
    }
    osmTestOAuthReturn.then(()=>{const authError=consumeOsmTestAuthError();if(authError)testStatus.textContent='認証失敗: '+authError;syncTestControls();});
    syncTestControls();
    controls.replaceChildren(back);
   }catch(e){error.textContent=e.message;}
  });
  back.addEventListener('click',()=>{pending=null;rows.hidden=false;tagsHeader.hidden=false;review.hidden=true;sourceRow.hidden=false;sourceStatus.hidden=false;note.hidden=false;controls.replaceChildren(confirm);add.hidden=activeSource!=='test'||!testReady;updateConfirm();});
  form.addEventListener('submit',event=>event.preventDefault());
  mask.addEventListener('pointerdown',event=>event.stopPropagation());
  mask.addEventListener('click',event=>{event.stopPropagation();if(event.target===mask)dismiss();});
  controls.append(confirm);
  metadata.style.color='#9bb5a8';
  metadata.style.margin='5px 0 10px';
  form.append(header,copyPane,sourceRow,sourceStatus,metadata,tagsHeader,rows,add,review,error,controls);
  applyBuildingTagEditorTheme(form);
  applyPendingTagVisualStyle(form); // Same approved yellow design as the mock.
  // Use actual test data when an element has already been copied; never
  // mislabel local production tags as test data.
  setSource(linkedTestTarget?'test':'production');
  form.style.zIndex='2';
  mask.append(previewTouch,form);host.appendChild(mask);editor=mask;
  editorKeyboardLayout=attachEditorKeyboardLayout({host,mask,sheet:form});
  editorScrollGuard=guardSheetScroll(mask,form,handle);
  const selectedKey=item.kind==='building'?item.osmType+':'+item.osmId:displayedSelection().key;
  const selectedFeature=buildings.find(b=>b.osmType+':'+b.osmId===selectedKey)||null;
  onEditorStateChange?.(true,{building:selectedFeature,shops:selectedFeature?shopsForFocus(selectedKey):[],screen});
  if(selectedFeature)editorPreviewGestures?.startAutoRotate();
 }
 // Add only newly completed feature labels; preserve the existing HTML
 // cards and their OSM editing callbacks between progressive display batches.
 // Actual card DOM is still lazy-created only after entering the viewport.
 function appendLabels(labels){
  if(!labels.length)return;
  for(const label of labels)entries.push({...label,source:label});
  for(const viewport of viewports)for(let i=0;i<labels.length;i++)viewport.items.push(null);
  shopIndexDirty=true;
 }
 function setLabels(labels){
  layer.replaceChildren(debugSvg);
  entries=[];
  for(const viewport of viewports){viewport.items=[];viewport.summary?.el.remove();viewport.summary=null;}
  appendLabels(labels);
 }
 // Finalize POI/building merges without discarding unchanged tag cards.
 // Original label objects survive the builder's POI reconciliation.
 function reconcileLabels(labels){
  const previous=entries;
  const previousIndex=new Map(previous.map((item,i)=>[item.source,i]));
  const retained=new Set();
  const next=labels.map(label=>{
   const index=previousIndex.get(label);
   const old=index===undefined?null:previous[index];
   if(old&&old.name===label.name&&old.x===label.x&&old.y===label.y&&old.z===label.z&&
      old.tags===label.tags&&old.osmType===label.osmType&&old.osmId===label.osmId){
    retained.add(index);
    return old;
   }
   return {...label,source:label};
  });
  for(const viewport of viewports){
   const before=viewport.items;
   const after=labels.map(label=>{
    const index=previousIndex.get(label);
    return index!==undefined&&retained.has(index)?before[index]:null;
   });
   for(let i=0;i<before.length;i++)if(before[i]&&!retained.has(i))before[i].el.remove();
   viewport.items=after;
  }
  entries=next;
  shopIndexDirty=true;
  for(const viewport of viewports){viewport.summary?.el.remove();viewport.summary=null;}
 }
 // Instantiate HTML only when a feature enters the screen, not for every OSM POI.
 function createItem(item,widthLimit,heightLimit){
    const el=document.createElement('div');
    el.style.cssText='position:absolute;display:none;pointer-events:none;cursor:pointer;transform:translateX(-50%);flex-direction:column;align-items:center;white-space:normal;';
    const card=document.createElement('div');
    card.style.cssText='box-sizing:border-box;min-width:0;overflow-wrap:anywhere;overflow-y:auto;padding:7px 11px 8px;border:1px solid rgba(123,234,216,.72);border-radius:10px;background:rgba(23,40,56,.75);box-shadow:0 3px 14px rgba(6,15,29,.22);color:white;font-family:system-ui,-apple-system,sans-serif;text-align:left;';
    const title=document.createElement('div');
    title.style.cssText='max-width:186px;overflow:hidden;text-overflow:ellipsis;color:#fff;font:600 13px/1.4 system-ui,-apple-system,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.28);';
    title.textContent=item.name;
    card.append(title);
    if(item.kind==='poi'&&item.tags?.level!==undefined){
     const floor=document.createElement('span');floor.textContent=' / level='+item.tags.level;floor.style.cssText='font-size:10px;color:#7bead8';title.appendChild(floor);
    }
    if(item.shopList){
     const count=document.createElement('div');count.style.cssText='font-size:11px;color:#a3f0df;margin:5px 0 4px';
     count.textContent='入居施設 '+item.shopList.length+'件（OSM登録分）';
     card.appendChild(count);
     const pane=document.createElement('div');
     pane.style.cssText='flex:1;min-width:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:none;pointer-events:none';
     pane.style.maxHeight=Math.max(30,heightLimit-54)+'px'; // adjusted after row styles are measurable
     pane.dataset.shopPane='true';
     pane.className='komorebi-tenant-pane';
     for(const shop of item.shopList){
      const row=document.createElement('div');
      row.style.cssText='padding:7px 3px;border-top:1px solid #6f908577;font:12px/1.4 system-ui';
      const prefix=shop.tags?.level!==undefined?'[level='+shop.tags.level+'] ':'';
      row.textContent=prefix+shop.name;
      const pendingGeofabrik=tenantIsPending(shop);
      if(shop.outsideFootprint||pendingGeofabrik){
       // Same yellow treatment as the existing 1m warning. Both can coexist.
       row.style.background='rgba(255,176,68,.16)';
       row.style.borderLeft='3px solid #ffbd62';
       row.style.paddingLeft='6px';
       const addWarning=message=>{
        const warning=document.createElement('span');
        warning.style.cssText='display:block;color:#ffd08a;font:600 10px/1.5 system-ui,-apple-system,sans-serif';
        warning.textContent=message;
        row.appendChild(warning);
       };
       if(shop.outsideFootprint)addWarning('⚠ 建物外（外周1m以内・位置要確認）');
       if(pendingGeofabrik)addWarning(PENDING_GEOFABRIK_LABEL);
      }
      row.dataset.osmKey=shop.osmType+':'+shop.osmId;
      row._osmItem=shop;pane.appendChild(row);
     }
     // Only an overflowing list accepts native touch/wheel scrolling; short
     // lists remain pointer-transparent and keep the original game hit test.
     pane.addEventListener('click',event=>{
      event.stopPropagation();
      const row=event.target.closest('[data-osm-key]');
      if(row&&pane.contains(row))openEditor(row._osmItem);
     });
     const wrapper=document.createElement('div');
     wrapper.style.cssText='display:flex;align-items:stretch;gap:6px;min-width:0';
     const rail=document.createElement('div');
     rail.style.cssText='display:none;flex:0 0 12px;flex-direction:column;align-items:center;gap:4px;pointer-events:none;color:#7bead8';
     rail.setAttribute('aria-hidden','true');
     const chevron=up=>{
      const arrow=document.createElement('span');
      arrow.style.cssText='display:block;flex:none;width:7px;height:7px;border-top:2px solid #7bead8;border-left:2px solid #7bead8;transform:rotate('+(up?'45':'225')+'deg);margin:'+(up?'4px 0 0':'0 0 4px')+';opacity:.95';
      return arrow;
     };
     const track=document.createElement('div');
     track.style.cssText='position:relative;flex:1;width:7px;min-height:10px;border-radius:9px;background:rgba(123,234,216,.16);border:1px solid rgba(123,234,216,.6);box-sizing:border-box';
     const thumb=document.createElement('div');
     thumb.style.cssText='position:absolute;top:0;left:0;right:0;height:16px;border-radius:8px;background:#7bead8;box-shadow:0 0 5px rgba(123,234,216,.48)';
     track.appendChild(thumb);
     rail.append(chevron(true),track,chevron(false));
     wrapper.append(pane,rail);
     const scrollbarStyle=document.createElement('style');
     scrollbarStyle.textContent='.komorebi-tenant-pane::-webkit-scrollbar{display:none;width:0;height:0}';
     card.append(scrollbarStyle,wrapper);
     pane.addEventListener('scroll',()=>syncShopPane(el),{passive:true});
     item._pane=pane;
    }
    card.style.width=widthLimit+'px';
    card.style.maxWidth=widthLimit+'px';
    card.style.maxHeight=heightLimit+'px';
    el.append(card);layer.appendChild(el);
    el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',item.name+'を編集');
    el.addEventListener('click',event=>{event.stopPropagation();openEditor(item);});
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openEditor(item);}});
    // Measure the complete, wrapped label once (not on every animation frame).
    el.style.display='flex';
    el.style.visibility='hidden';
    limitShopPaneHeight(el,heightLimit);
    const width=el.offsetWidth||widthLimit,height=el.offsetHeight||72;
    syncShopPane(el);
    el.style.display='none';
    el.style.visibility='';
    return {...item,el,width,height,widthLimit,heightLimit};
 }
 // Cap the directory at nine one-line tenant rows plus one two-line row.
 // Measure font/spacing from the rendered row rather than fixing a pixel height;
 // longer shop names may wrap to any number of lines and remain scrollable.
 function limitShopPaneHeight(el,heightLimit){
  const pane=el.querySelector('[data-shop-pane]');
  if(!pane)return;
  const row=pane.firstElementChild;
  if(!row){pane.style.maxHeight=Math.max(30,heightLimit-54)+'px';return;}
  const style=getComputedStyle(row);
  const metric=key=>Number.parseFloat(style[key])||0;
  const lineHeight=metric('lineHeight')||16.8;
  const oneLineHeight=lineHeight+metric('paddingTop')+metric('paddingBottom')+
   metric('borderTopWidth')+metric('borderBottomWidth')+metric('marginTop')+metric('marginBottom');
  const tenRowsWithOneExtraLine=10*oneLineHeight+lineHeight;
  pane.style.maxHeight=Math.max(30,Math.min(heightLimit-54,Math.ceil(tenRowsWithOneExtraLine)))+'px';
 }
 // A long list is the only interactive child of the otherwise transparent label.
 // This lets iOS Safari scroll naturally without activating camera/movement pads.
 function syncShopPane(el){
  const pane=el.querySelector('[data-shop-pane]');
  if(!pane)return;
  const rail=pane.nextElementSibling;
  const scrollable=pane.scrollHeight>pane.clientHeight+1;
  pane.style.pointerEvents=scrollable?'auto':'none';
  if(!rail)return;
  rail.style.display=scrollable?'flex':'none';
  if(!scrollable)return;
  const track=rail.children[1],thumb=track.firstElementChild;
  const trackHeight=track.clientHeight;
  const thumbHeight=Math.max(12,Math.min(trackHeight,trackHeight*pane.clientHeight/pane.scrollHeight));
  const maxScroll=Math.max(1,pane.scrollHeight-pane.clientHeight);
  thumb.style.height=thumbHeight+'px';
  thumb.style.transform='translateY('+(Math.max(0,Math.min(1,pane.scrollTop/maxScroll))*Math.max(0,trackHeight-thumbHeight))+'px)';
 }
 // Resolve the visible scrollable tenant list by screen coordinates, independent
 // of WebView pointer hit-testing and the overlay's pointer-events setting.
 function scrollPaneAt(clientX,clientY){
  if(editor||!layer.isConnected)return null;
  for(const viewport of viewports){
   if(!viewport.canvas.isConnected)continue;
   const measured=viewport.summary;
   if(measured?.el.style.display!=='flex')continue;
   const pane=measured.el.querySelector('[data-shop-pane]');
   if(!pane||pane.scrollHeight<=pane.clientHeight+1)continue;
   const rect=pane.getBoundingClientRect();
   if(clientX>=rect.left&&clientX<=rect.right&&clientY>=rect.top&&clientY<=rect.bottom)return pane;
  }
  return null;
 }
 // Pointer-transparent cards keep the existing left/right game controls active.
 // Hit testing is limited to the visible card, not its decorative stem/dot.
 function hitTest(clientX,clientY){
  if(editor||!layer.isConnected)return null;
  for(const viewport of viewports){
   if(!viewport.canvas.isConnected)continue;
   for(const measured of [...viewport.items,viewport.summary]){
    if(!measured||measured.el.style.display!=='flex')continue;
    const card=measured.el.firstElementChild;
    const rect=card.getBoundingClientRect();
    if(clientX>=rect.left&&clientX<=rect.right&&clientY>=rect.top&&clientY<=rect.bottom){
     if(measured.shopList){
      for(const node of card.querySelectorAll('[data-osm-key]')){
       const r=node.getBoundingClientRect();
       if(clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom){
        if(node.dataset.osmKey){
         const pane=measured.el.querySelector('[data-shop-pane]');
         const bounds=pane?.getBoundingClientRect();
         if(bounds&&(r.bottom<=bounds.top||r.top>=bounds.bottom))continue;
        }
        return node._osmHit||(node._osmHit={owner:measured,editItem:node._osmItem});
       }
      }
     }
     return measured;
    }
   }
  }
  return null;
 }
 function openHit(measured){
  const owner=measured?.owner||measured;
  if(!owner||editor||!layer.isConnected||owner.el.style.display!=='flex')return false;
  if(!viewports.some(viewport=>viewport.items.includes(owner)||viewport.summary===owner))return false;
   openEditor(measured.editItem||owner);
  return Boolean(editor);
 }
 function sizeItem(measured,widthLimit,heightLimit){
  if(measured.widthLimit===widthLimit&&measured.heightLimit===heightLimit)return;
  const card=measured.el.firstElementChild;
  card.style.width=widthLimit+'px';
  card.style.maxWidth=widthLimit+'px';
  card.style.maxHeight=heightLimit+'px';
  const pane=card.querySelector('[data-shop-pane]');
  const wasVisible=measured.el.style.display==='flex';
  measured.el.style.display='flex';
  measured.el.style.visibility='hidden';
  limitShopPaneHeight(measured.el,heightLimit);
  measured.width=measured.el.offsetWidth||widthLimit;
  measured.height=measured.el.offsetHeight||72;
  syncShopPane(measured.el);
  measured.el.style.display=wasVisible?'flex':'none';
  measured.el.style.visibility='';
  measured.widthLimit=widthLimit;measured.heightLimit=heightLimit;
 }
 function replaceCanvas(screen,canvas){
  const viewport=viewports.find(viewport=>viewport.screen===screen);
  if(viewport&&canvas&&host.contains(canvas))viewport.canvas=canvas;
 }
  function update(camera,player){
  const empty={total:entries.length,inRange:0,inView:0,shown:0};
  if(!camera||!layer.isConnected)return empty;
  if(editor||previewActive){
   for(const viewport of viewports){if(viewport.summary?.el)viewport.summary.el.style.display='none';}
   debugSvg.replaceChildren();
   return empty;
  }
  lastCamera=camera;
  const [ex,ey,ez]=camera.eye,[tx,ty,tz]=camera.target;
  const px=player?.x??tx,py=player?.y??ty,pz=player?.z??tz;
  let fx=tx-ex,fy=ty-ey,fz=tz-ez,fl=Math.hypot(fx,fy,fz);
  if(!fl)return empty;
  fx/=fl;fy/=fl;fz/=fl;
  let rx=-fz,rz=fx,rl=Math.hypot(rx,rz);
  if(rl<1e-6){rx=1;rz=0;rl=1;}
  rx/=rl;rz/=rl;
  const ux=-fy*rz,uy=fx*rz-fz*rx,uz=fy*rx;
  const tanHalf=Math.tan((camera.fovDegrees??45)*Math.PI/360);
  if(!(tanHalf>0))return empty;
  // Select the frontmost actual building along the camera's center ray.
  // A short dwell avoids rapid label flicker when the crosshair crosses an edge.
  const now=performance.now();
  if(now-lastFocusAt>=80){
   const selected=pickFocusedBuilding(buildings,camera);
   const key=selected?selected.osmType+':'+selected.osmId:null;
   if(key!==pendingKey){pendingKey=key;pendingSince=now;}
   if(focusedKey!==pendingKey&&now-pendingSince>=120){focusedKey=pendingKey;focusedHit=null;}
   if(focusedKey===key)focusedHit=selected?.hitPoint??null;
   lastFocusAt=now;
  }
  // Do not clear tagHidden when the camera turns to another building.
  const {key:selectedKey,hitPoint:selectedHit}=displayedSelection();
  const index=selectedKey===null?-1:entries.findIndex(item=>item.kind==='building'&&item.osmType+':'+item.osmId===selectedKey);
  const focusedBuilding=selectedKey===null?null:buildings.find(b=>b.osmType+':'+b.osmId===selectedKey);
  const shops=focusedBuilding?shopsForFocus(selectedKey):[];
  const buildingEntry=index<0&&focusedBuilding?{
   kind:'building',name:'建物（'+selectedKey+'）',osmType:focusedBuilding.osmType,osmId:focusedBuilding.osmId,
   x:(focusedBuilding.bounds[0]+focusedBuilding.bounds[1])/2,
   z:(focusedBuilding.bounds[2]+focusedBuilding.bounds[3])/2,
   y:focusedBuilding.height+.9,osmVersion:focusedBuilding.osmVersion,tags:focusedBuilding.tags||{},source:focusedBuilding
  }:index>=0?entries[index]:null;
  // One building directory retains every matched OSM POI in a scrollable viewport.
  const ranked=buildingEntry?[{i:-1,item:{...buildingEntry,shopList:shops}}]:[];
  let inView=0,shown=0;
  const hostRect=host.getBoundingClientRect();
  debugSvg.replaceChildren();
  for(const viewport of viewports){
   const hide=()=>{if(viewport.summary?.el.style.display==='flex')viewport.summary.el.style.display='none';};
   const rect=viewport.canvas.getBoundingClientRect();
   if(rect.width<1||rect.height<1||!ranked.length){hide();continue;}
   // The directory stays near the top center of this game screen.
   // Only the cyan 3D anchor and connecting line move with the camera.
   const widthLimit=Math.max(1,Math.min(210,Math.floor(rect.width-12)));
   const heightLimit=Math.max(1,Math.floor(rect.height-42));
   const topInset=Math.min(28,Math.max(8,Math.floor(rect.height*.06)));
   const {item}=ranked[0];
   const signature=selectedKey+'|'+shops.map(shop=>shop.osmType+':'+shop.osmId+':'+shop.name+':'+(shop.tags?.level??'')+':'+(shop.outsideFootprint?'outside':'inside')+':'+(tenantIsPending(shop)?'pending':'synced')).join('|');
   if(viewport.summary?.signature!==signature){
    viewport.summary?.el.remove();
    viewport.summary=createItem(item,widthLimit,heightLimit);
    viewport.summary.signature=signature;
   }
   const measured=viewport.summary;
   sizeItem(measured,widthLimit,heightLimit);
   // Preserve the existing 3D anchor selection, including the visible wall/roof
   // fallback for tall buildings whose roof projects above the screen.
   const scale=rect.height/(2*tanHalf);
   let vx=item.x-ex,vy=item.y-ey,vz=item.z-ez;
   let depth=vx*fx+vy*fy+vz*fz;
   let x=depth>.2?rect.width/2+(vx*rx+vz*rz)*scale/depth:NaN;
   let y=depth>.2?rect.height/2-(vx*ux+vy*uy+vz*uz)*scale/depth:NaN;
   if(!(depth>.2&&x>=0&&x<=rect.width&&y>=0&&y<=rect.height)&&selectedHit){
    vx=selectedHit[0]-ex;vy=selectedHit[1]-ey;vz=selectedHit[2]-ez;
    depth=vx*fx+vy*fy+vz*fz;
    if(depth>.2){
     x=rect.width/2+(vx*rx+vz*rz)*scale/depth;
     y=rect.height/2-(vx*ux+vy*uy+vz*uz)*scale/depth;
    }
   }
   if(!(depth>.2&&x>=0&&x<=rect.width&&y>=0&&y<=rect.height)){
    hide();continue;
   }
   inView++;
   if(measured.height+topInset>rect.height||measured.width+8>rect.width){
    hide();continue;
   }
   const el=measured.el;
   const newlyVisible=el.style.display!=='flex';
   const left=rect.left-hostRect.left+rect.width/2;
   const top=rect.top-hostRect.top+topInset;
   // Avoid writing an unchanged DOM position on every animation frame.
   if(measured.fixedLeft!==left||measured.fixedTop!==top){
    el.style.left=left+'px';
    el.style.top=top+'px';
    measured.fixedLeft=left;measured.fixedTop=top;
   }
   if(newlyVisible){
    el.style.display='flex';
    const pane=el.querySelector('[data-shop-pane]');
    if(pane)pane.scrollTop=0;
    // Measure after display:flex; hidden panels report zero clientHeight.
    syncShopPane(el);
   }
   drawDebugAnchor(measured,rect,hostRect,x,y,rect.width/2,topInset+measured.height);
   shown++;
  }
  return {total:entries.length,inRange:ranked.length,inView,shown};
 }
 function selectTappedBuildingAt(clientX,clientY){
  if(editor||!lastCamera||!layer.isConnected)return false;
  for(const viewport of viewports){
   if(!viewport.canvas.isConnected)continue;
   const rect=viewport.canvas.getBoundingClientRect();
   if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)continue;
   const selected=pickBuildingAtScreen(buildings,lastCamera,clientX-rect.left,clientY-rect.top,rect.width,rect.height);
   if(!selected)return false;
   const key=selected.osmType+':'+selected.osmId;
   if(!tagHidden&&displayedSelection().key===key){
    // A second tap on the currently displayed building hides all tags.
    setTagHidden(true);
   }else{
    // Any actual building tap is the only way to lift suppression.
    setTagHidden(false);
    tappedBuilding={key,hitPoint:selected.hitPoint};
   }
   return true;
  }
  return false;
 }
 function clearTappedBuilding(){tappedBuilding=null;}
 return {setLabels,appendLabels,setBuildingFeatures,appendBuildingFeatures,reconcileLabels,replaceCanvas,setDebugAnchors,setPreviewActive,setTagHidden,isTagHidden,scrollPaneAt,selectTappedBuildingAt,clearTappedBuilding,refreshPendingTags(){refreshEditorPending?.();},refreshPendingTenants,update,hitTest,openHit,dispose(){closeEditor();layer.remove();entries=[];}};
}
