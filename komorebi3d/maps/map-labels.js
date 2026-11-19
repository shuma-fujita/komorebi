// Project building and ground-level POI labels using shared A/B viewport camera information.
import {OSM_TEST_ORIGIN,hasOsmTestToken,forgetOsmTestToken,consumeOsmTestAuthError,startOsmTestLogin,finishOsmTestLogin,getOsmTestElement,validateOsmTestLevelTarget,sendOsmTestLevel,loadOsmCopySource,createOsmTestCopy} from './osm-test-api.js?v=osm-auto-comment-20261113';
const osmTestOAuthReturn=finishOsmTestLogin();
// Uses a plain-text ignore file; no special handling of newly discovered OSM tag keys.
export function parseOsmTagIgnore(source){
 return String(source).split(/\r?\n/).map(line=>line.trim())
  .filter(line=>line&&!line.startsWith('#'))
  .map(line=>line.endsWith('*')?{prefix:line.slice(0,-1)}:{exact:line});
}
export async function loadOsmTagIgnore(url='./maps/osm-tags.ignore'){
 const response=await fetch(url,{cache:'no-cache'});
 if(!response.ok)throw new Error('OSMタグ除外ルールの読み込み失敗 HTTP '+response.status);
 return parseOsmTagIgnore(await response.text());
}
export function visibleOsmTags(tags={},rules=[]){
 return Object.entries(tags).filter(([key])=>!rules.some(rule=>rule.exact===key||(rule.prefix!==undefined&&key.startsWith(rule.prefix))));
}
import {pickFocusedBuilding} from './map-focus.js?v=focus-ray-v2-20261119';
import {shopsInFocusedBuilding} from './map-occupants.js?v=occupants-v3-desc-20261119';

export function createMapLabels(host,ignoreRules=[],{screen=null,onEditorStateChange=null}={}){
 const layer=document.createElement('div');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3';
 host.appendChild(layer);
 const viewports=[...host.querySelectorAll('.view-panel > canvas')].map((canvas,i)=>({canvas,screen:i===0?'A':'B',items:[]})).filter(viewport=>screen===null||viewport.screen===screen);
 let entries=[];
 let buildings=[];
 let cachedShops=[],lastShopKey=null,shopIndexDirty=true,shopMode='A';
 function setShopMode(mode){if(mode!=='A'&&mode!=='B')return;shopMode=mode;}
 function shopsForFocus(){
  if(shopIndexDirty||lastShopKey!==focusedKey){
   cachedShops=shopsInFocusedBuilding(buildings,entries,focusedKey);
   shopIndexDirty=false;lastShopKey=focusedKey;
  }
  return cachedShops;
 }
 let focusedKey=null,focusedHit=null,pendingKey=null,pendingSince=0,lastFocusAt=-Infinity;
 function appendBuildingFeatures(features){
  if(!features?.length)return;
  for(const feature of features)if(feature.type==='building'&&feature.osmId!=null)buildings.push(feature);
  lastFocusAt=-Infinity;shopIndexDirty=true;
 }
 function setBuildingFeatures(features){
  buildings=[];
  focusedKey=null;focusedHit=null;pendingKey=null;pendingSince=0;
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
  const ax=ox+x,ay=oy+y,sx=ox+labelX,sy=oy+labelY-29;
  if(item.shopLayout==='B'&&item.shopList){
   const pane=item._pane;
   const bounds=pane?.getBoundingClientRect();
   for(const row of pane?.querySelectorAll('[data-osm-key]')||[]){
    const r=row.getBoundingClientRect();
    if(bounds&&r.bottom>bounds.top&&r.top<bounds.bottom){
     const startX=r.left-hostRect.left+r.width/2,startY=r.top-hostRect.top+r.height/2;
     debugSvg.appendChild(element('line',{x1:startX,y1:startY,x2:ax,y2:ay,stroke:'#7bead8','stroke-width':1.4}));
    }
   }
  }else debugSvg.appendChild(element('line',{x1:sx,y1:sy,x2:ax,y2:ay,stroke:'#7bead8','stroke-width':1.5}));
  debugSvg.appendChild(element('circle',{cx:ax,cy:ay,r:3.5,fill:'#7bead8',stroke:'rgba(23,40,56,.45)','stroke-width':2}));
  if(!debugAnchors)return;
  const right=ax+85>ox+rect.width;
  const text=element('text',{x:right?ax-8:ax+8,y:Math.max(oy+12,ay-8),'text-anchor':right?'end':'start',fill:'#fff5a8','font-size':10,'font-weight':700,stroke:'#14251d','stroke-width':3,'paint-order':'stroke'});
  text.textContent=(item.kind==='building'?'building':'poi')+' '+item.osmType+'/'+item.osmId;
  debugSvg.appendChild(text);
 }

 // JSON edit/confirm, with strictly isolated OSM development-server level test.
 let editor=null;
 function closeEditor(){
  if(!editor)return;
  editor.remove();editor=null;
  onEditorStateChange?.(false);
 }
 function openEditor(item){
  if(!item.osmType||!item.osmId)return;
  closeEditor();
  const baseTags={...(item.originalTags||item.tags||{})};
  const initial={...baseTags};
  const mask=document.createElement('div');
  mask.style.cssText='position:absolute;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(8,18,25,.72);pointer-events:auto;';
  const form=document.createElement('form');
  form.style.cssText='box-sizing:border-box;width:min(100%,430px);max-height:94%;overflow:auto;padding:16px;background:#f8fcfa;color:#18352f;border-radius:14px;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 10px 35px #06140d66;';
  const title=document.createElement('h3');
  title.textContent=item.name+'｜OSMタグの編集';
  title.style.cssText='font-size:17px;line-height:1.4;margin:0 0 7px;';
  const header=document.createElement('div');
  header.style.cssText='display:flex;align-items:flex-start;gap:8px;justify-content:space-between;';
  title.style.flex='1';
  const copyButton=document.createElement('button');
  copyButton.type='button';copyButton.textContent='テスト環境へコピー';
  copyButton.style.cssText='flex:none;max-width:145px;padding:7px 9px;border-radius:8px;border:1px solid #3b7c64;background:#ecf8f0;color:#176449;font:700 12px/1.35 system-ui;';
  header.append(title,copyButton);
  const copyPane=document.createElement('section');
  copyPane.hidden=true;
  copyPane.style.cssText='padding:10px;margin:8px 0;background:#edf4ee;border:1px solid #9db7a9;border-radius:9px;';
  const copyInfo=document.createElement('p');
  copyInfo.style.cssText='font-size:12px;margin:2px 0 9px;';
  copyInfo.textContent='本番OSMから読み取り、元のタグと位置をテストサーバーへ新規コピーします。本番のデータは変更しません。';
  const copyPreview=document.createElement('pre');
  copyPreview.hidden=true;
  copyPreview.style.cssText='max-height:22vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px;border-radius:6px;background:#fff;color:#173d2e;font:12px/1.5 ui-monospace,monospace;';
  const copyStatus=document.createElement('p');
  copyStatus.style.cssText='font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:#345849;';
  const decorateStatus=(el)=>{
   const update=()=>{
    const message=el.textContent.trim(),isError=/^(?:読み込み失敗|テスト送信失敗|コピー作成エラー|コピー準備エラー|認証開始エラー|認証失敗|テストAPI HTTP)/.test(message);
    el.style.cssText='box-sizing:border-box;font:12px/1.6 system-ui;white-space:pre-wrap;overflow-wrap:anywhere;'+
     (isError?'padding:11px;border:1px solid #c98578;border-radius:9px;background:#fae6df;color:#823a30;':'color:#345849;');
   };
   new MutationObserver(update).observe(el,{childList:true,characterData:true,subtree:true});
   update();
  };
  decorateStatus(copyStatus);
  const copyClientLabel=document.createElement('label');
  copyClientLabel.textContent='テスト環境OAuth Client ID';
  copyClientLabel.style.cssText='display:block;margin:5px 0;font-size:12px;';
  const copyClient=document.createElement('input');
  copyClient.placeholder='開発用Client ID（ログイン済みなら不要）';
  copyClient.style.cssText='box-sizing:border-box;width:100%;padding:8px;border:1px solid #91aca0;border-radius:6px;';
  copyClientLabel.appendChild(copyClient);
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
  const copyLink=document.createElement('a');
  copyLink.href=OSM_TEST_ORIGIN+'/oauth2/applications/new';copyLink.target='_blank';copyLink.rel='noopener noreferrer';
  copyLink.textContent='テスト環境のOAuthアプリ登録';
  copyLink.style.cssText='display:block;font-size:12px;margin:5px 0;';
  const copySuccess=document.createElement('div');
  copySuccess.hidden=true;
  // Same green palette as the selected Matsudo world button.
  copySuccess.style.cssText='box-sizing:border-box;width:100%;margin:9px 0 0;padding:12px;border:1px solid #64956c;border-radius:9px;background:#d9ebd5;color:#31563b;font:13px/1.6 system-ui;overflow-wrap:anywhere;';
  const copySuccessText=document.createElement('div');
  copySuccessText.style.cssText='font-weight:700;white-space:pre-wrap;';
  const copyResult=document.createElement('div');
  copyResult.style.cssText='margin-top:7px;font-size:12px;';
  copySuccess.append(copySuccessText,copyResult);
  copyPane.append(copyInfo,copyPreview,copyStatus,copyClientLabel,copyAuth,copyLink,copyConsentLabel,copyExecute,copySuccess);
  let copySource=null,copyBusy=false,copyCreated=false;
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
   try{await startOsmTestLogin(copyClient.value);}catch(e){copyStatus.textContent='認証開始エラー: '+e.message;}
  });
  copyConsent.addEventListener('change',refreshCopyButtons);
  copyExecute.addEventListener('click',async()=>{
   if(copyBusy||copyCreated)return;
   if(!copySource){copyStatus.textContent='まだコピー元を取得できていません。上の「テスト環境へコピー」を開き直して、コピー元データが表示されるか確認してください。';return;}
   if(!hasOsmTestToken()){copyStatus.textContent='Komorebi側のOAuth認証が未完了です。テストサイトでログインするだけでなく、開発用OAuthアプリを登録し、Client IDを入力して「テスト環境へログイン」を押してください。';return;}
   if(!copyConsent.checked){copyStatus.textContent='コピー元の内容を確認して、実際にテスト環境へ複製するチェックを入れてください。';return;}
   copyBusy=true;copyStatus.textContent='テストサーバーへコピー作成中…';refreshCopyButtons();
   try{
    const result=await createOsmTestCopy(copySource);
    copyCreated=true;
    copyStatus.textContent='';
    copySuccessText.textContent='✅ コピー完了！\nテスト用 '+result.type+'/'+result.id+'\nchangeset '+result.changesetId;
    copySuccess.hidden=false;
    const anchor=document.createElement('a');anchor.href=result.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent='テスト環境でコピーを見る';
    copyResult.appendChild(anchor);
    // The existing level edit panel can use this new ID immediately.
    targetType.value=result.type;targetId.value=result.id;
    loaded=null;testDetails.hidden=true;syncTestControls();
   }catch(e){copySuccess.hidden=true;copyStatus.textContent='コピー作成エラー: '+e.message;}
   finally{copyBusy=false;refreshCopyButtons();}
  });
  const note=document.createElement('p');
  note.textContent='既存タグを編集して確認できます。本番OSMには送信しません。';
  note.style.cssText='color:#4e655b;font-size:12px;margin:0 0 8px;';
  const metadata=document.createElement('p');
  metadata.textContent='OSM '+item.osmType+'/'+item.osmId+' ／ version: '+(item.osmVersion??'未取得');
  metadata.style.cssText='font-size:11px;color:#587166;margin:4px 0;';
  const rows=document.createElement('div');
  const inputStyle='box-sizing:border-box;width:100%;min-width:0;padding:8px;border:1px solid #aabfb5;border-radius:7px;background:white;color:#152b25;font:13px/1.4 system-ui,-apple-system,sans-serif;';
  function addRow(key='',value=''){
   const row=document.createElement('div');
   row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 32px;gap:5px;margin:6px 0;';
   const k=document.createElement('input');k.value=key;k.placeholder='タグ名';k.setAttribute('aria-label','タグ名');k.style.cssText=inputStyle;
   const v=document.createElement('input');v.value=value;v.placeholder='値';v.setAttribute('aria-label','タグの値');v.style.cssText=inputStyle;
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';
   remove.setAttribute('aria-label',key+' タグを削除');
   remove.style.cssText='border:1px solid #aabfb5;border-radius:7px;background:white;color:#8b3535;font-size:18px;';
   remove.addEventListener('click',()=>row.remove());
   row.append(k,v,remove);rows.appendChild(row);
  }
  const tagsHeader=document.createElement('p');
  tagsHeader.textContent='タグ名 / 値';
  tagsHeader.style.cssText='font-weight:700;margin:12px 0 4px;';
  for(const [k,v] of Object.entries(initial))addRow(k,String(v));
  const add=document.createElement('button');add.type='button';add.textContent='＋ タグを追加';
  add.style.cssText='padding:8px 11px;border:1px solid #aabfb5;border-radius:7px;background:#fff;color:#236c56;font-weight:700;';
  add.addEventListener('click',()=>{addRow();rows.lastElementChild?.firstElementChild?.focus();});
  const error=document.createElement('p');
  error.style.cssText='color:#a52f2f;font-size:12px;min-height:1em;';
  const review=document.createElement('div');review.hidden=true;
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
  const testLink=document.createElement('a');
  testLink.href=OSM_TEST_ORIGIN+'/oauth2/applications/new';
  testLink.target='_blank';testLink.rel='noopener noreferrer';
  testLink.textContent='テスト用OAuthアプリを登録（別タブ）';
  testLink.style.cssText='display:block;font-size:12px;margin:6px 0;color:#205b7a;';
  const testField=(captionText,placeholder,value='')=>{
   const wrap=document.createElement('label');wrap.style.cssText='display:block;font-size:12px;font-weight:700;margin:8px 0;';
   const label=document.createElement('span');label.textContent=captionText;label.style.display='block';
   const input=document.createElement('input');input.value=value;input.placeholder=placeholder;input.style.cssText=inputStyle;
   wrap.append(label,input);testPane.appendChild(wrap);return input;
  };
  const clientId=testField('開発用OAuth Client ID（認証後は再入力不要）','開発サーバーで登録したClient ID');
  const oauth=makeButton('テスト環境にログイン');
  const logout=makeButton('認証を解除');
  const targetType=document.createElement('select');targetType.style.cssText=inputStyle;
  for(const type of ['node','way','relation']){const option=document.createElement('option');option.value=type;option.textContent=type;targetType.appendChild(option);}
  const typeLabel=document.createElement('label');typeLabel.style.cssText='display:block;font-size:12px;font-weight:700;margin:8px 0;';typeLabel.textContent='テスト対象の要素種別';
  typeLabel.appendChild(targetType);
  const targetId=testField('テストサーバーの店舗・施設ID','4365808698 または node/4365808698');
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
   try{await startOsmTestLogin(clientId.value);}catch(e){testStatus.textContent='認証開始エラー: '+e.message;}
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
  testPane.append(testHeading,testHelp,testLink,oauth,logout,typeLabel,targetId.parentElement,loadTarget,testDetails,consentLabel,send,testStatus);
  review.appendChild(testPane);

  const close=makeButton('閉じる'),confirm=makeButton('確認',true),back=makeButton('編集に戻る');
  const dismiss=()=>closeEditor();
  close.addEventListener('click',dismiss);
  function collect(){
   const tags={};
   for(const row of rows.children){
    const k=row.children[0].value.trim(),v=row.children[1].value;
    if(!k){if(v.trim())throw Error('タグ名が空欄です');continue;}
    if(Object.prototype.hasOwnProperty.call(tags,k))throw Error('タグ名が重複しています: '+k);
    if(/[\u0000-\u001f=]/.test(k))throw Error('タグ名に使用できない文字が含まれています');
    tags[k]=v;
   }
   const changed={};
   for(const key of new Set([...Object.keys(baseTags),...Object.keys(tags)])){
    if(baseTags[key]!==tags[key])changed[key]=Object.prototype.hasOwnProperty.call(tags,key)?tags[key]:null;
   }
   return {osm:{type:item.osmType,id:String(item.osmId),version:item.osmVersion??null},tags,changes:changed};
  }
  let pending=null;
  confirm.addEventListener('click',()=>{
   try{
    pending=collect();error.textContent='';
    json.textContent=JSON.stringify({osm:pending.osm,changes:pending.changes,tags:pending.tags},null,2);
    rows.hidden=true;add.hidden=true;tagsHeader.hidden=true;review.hidden=false;
    testPane.hidden=!eligible;
    loaded=null;consent.checked=false;testDetails.hidden=true;
    levelValue=null;
    if(eligible&&Object.keys(pending.changes).length===1&&Object.prototype.hasOwnProperty.call(pending.changes,'level')&&/^(?:[0-8])$/.test(String(pending.tags.level))){
     levelValue=Number(pending.tags.level);
     testStatus.textContent='準備OK: level='+levelValue+'。開発用Client IDで認証し、テスト側の要素IDを指定してください。';
    }else if(eligible){
     testStatus.textContent='テスト送信には、追加する変更を level=0〜8 の1項目だけにしてください（1階は0）。';
    }
    osmTestOAuthReturn.then(()=>{const authError=consumeOsmTestAuthError();if(authError)testStatus.textContent='認証失敗: '+authError;syncTestControls();});
    syncTestControls();
    controls.replaceChildren(back,close);
   }catch(e){error.textContent=e.message;}
  });
  back.addEventListener('click',()=>{pending=null;rows.hidden=false;add.hidden=false;tagsHeader.hidden=false;review.hidden=true;controls.replaceChildren(close,confirm);});
  form.addEventListener('submit',event=>event.preventDefault());
  mask.addEventListener('pointerdown',event=>event.stopPropagation());
  mask.addEventListener('click',event=>{event.stopPropagation();if(event.target===mask)dismiss();});
  controls.append(close,confirm);
  form.append(header,copyPane,note,metadata,tagsHeader,rows,add,review,error,controls);
  mask.appendChild(form);host.appendChild(mask);editor=mask;
  onEditorStateChange?.(true);
 }
 // Add only newly completed feature labels; preserve the existing HTML
 // cards and their OSM editing callbacks between progressive display batches.
 // Actual card DOM is still lazy-created only after entering the viewport.
 function appendLabels(labels){
  if(!labels.length)return;
  for(const label of labels)entries.push({...label,source:label,visibleTags:visibleOsmTags(label.tags,ignoreRules)});
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
   return {...label,source:label,visibleTags:visibleOsmTags(label.tags,ignoreRules)};
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
    el.style.cssText='position:absolute;display:none;pointer-events:none;cursor:pointer;transform:translate(-50%,-100%);flex-direction:column;align-items:center;white-space:normal;padding-bottom:29px;';
    const card=document.createElement('div');
    card.style.cssText='box-sizing:border-box;min-width:0;overflow-wrap:anywhere;overflow-y:auto;padding:7px 11px 8px;border:1px solid rgba(123,234,216,.72);border-radius:10px;background:rgba(23,40,56,.75);box-shadow:0 3px 14px rgba(6,15,29,.22);color:white;font-family:system-ui,-apple-system,sans-serif;text-align:left;';
    const header=document.createElement('div');
    header.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px;';
    for(const [key,value] of item.visibleTags){
     const tag=document.createElement('span');
     tag.style.cssText='display:inline-block;min-width:0;max-width:100%;box-sizing:border-box;padding:2px 5px;border:1px solid rgba(123,234,216,.55);border-radius:4px;color:#7bead8;font:500 9px/1.35 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere;';
     tag.textContent=key+': '+String(value);
     header.appendChild(tag);
    }
    if(!item.visibleTags.length||item.kind==='poi'||item.shopList)header.style.display='none';
    const title=document.createElement('div');
    title.style.cssText='max-width:186px;overflow:hidden;text-overflow:ellipsis;color:#fff;font:600 13px/1.4 system-ui,-apple-system,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.28);';
    title.textContent=item.name;
    card.append(header,title);
    if(item.kind==='poi'&&item.tags?.level!==undefined){
     const floor=document.createElement('span');floor.textContent=' / level='+item.tags.level;floor.style.cssText='font-size:10px;color:#7bead8';title.appendChild(floor);
    }
    if(item.shopList){
     const count=document.createElement('div');count.style.cssText='font-size:11px;color:#a3f0df;margin:5px 0 4px';
     count.textContent=(item.shopLayout==='B'?'個別タグ ':'入居施設 ')+item.shopList.length+'件（OSM登録分）';
     card.appendChild(count);
     const pane=document.createElement('div');
     pane.style.cssText='overflow:auto;overscroll-behavior:contain;scrollbar-width:thin';
     pane.style.maxHeight=Math.max(30,heightLimit-95)+'px';
     pane.dataset.shopPane='true';
     for(const shop of item.shopList){
      const row=document.createElement('div');
      row.style.cssText=item.shopLayout==='B'
       ?'margin:5px 2px;padding:7px 6px;border:1px solid #7bead8;border-radius:6px;background:#295350;font:12px/1.4 system-ui'
       :'padding:7px 3px;border-top:1px solid #6f908577;font:12px/1.4 system-ui';
      const prefix=shop.tags?.level!==undefined?'[level='+shop.tags.level+'] ':'';
      row.textContent=prefix+shop.name;row.dataset.osmKey=shop.osmType+':'+shop.osmId;
      row._osmItem=shop;pane.appendChild(row);
     }
     const controls=document.createElement('div');
     controls.style.cssText='display:flex;justify-content:space-between;gap:6px;margin-top:5px;font:11px system-ui';
     for(const [label,delta] of [['▲ 前へ',-120],['▼ 次へ',120]]){
      const button=document.createElement('div');button.textContent=label;button.dataset.scrollDelta=String(delta);
      button.style.cssText='flex:1;padding:5px 3px;text-align:center;border-radius:4px;border:1px solid #7bead8;color:#7bead8';
      controls.appendChild(button);
     }
     card.append(pane,controls);
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
    const width=el.offsetWidth||widthLimit,height=el.offsetHeight||72;
    el.style.display='none';
    el.style.visibility='';
    return {...item,el,width,height,widthLimit,heightLimit};
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
      for(const node of card.querySelectorAll('[data-osm-key],[data-scroll-delta]')){
       const r=node.getBoundingClientRect();
       if(clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom){
        if(node.dataset.osmKey){
         const pane=measured.el.querySelector('[data-shop-pane]');
         const bounds=pane?.getBoundingClientRect();
         if(bounds&&(r.bottom<=bounds.top||r.top>=bounds.bottom))continue;
        }
        return node._osmHit||(node._osmHit=node.dataset.osmKey
         ?{owner:measured,editItem:node._osmItem}
         :{owner:measured,scrollDelta:Number(node.dataset.scrollDelta)});
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
  if(measured.scrollDelta){
   const pane=owner.el.querySelector('[data-shop-pane]');
   if(pane)pane.scrollTop+=measured.scrollDelta;
   return true;
  }
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
  if(pane)pane.style.maxHeight=Math.max(30,heightLimit-95)+'px';
  measured.el.style.display='flex';
  measured.el.style.visibility='hidden';
  measured.width=measured.el.offsetWidth||widthLimit;
  measured.height=measured.el.offsetHeight||72;
  measured.el.style.display='none';
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
  const index=focusedKey===null?-1:entries.findIndex(item=>item.kind==='building'&&item.osmType+':'+item.osmId===focusedKey);
  const focusedBuilding=focusedKey===null?null:buildings.find(b=>b.osmType+':'+b.osmId===focusedKey);
  const shops=focusedBuilding?shopsForFocus():[];
  const buildingEntry=index<0&&focusedBuilding?{
   kind:'building',name:'建物（'+focusedKey+'）',osmType:focusedBuilding.osmType,osmId:focusedBuilding.osmId,
   x:(focusedBuilding.bounds[0]+focusedBuilding.bounds[1])/2,
   z:(focusedBuilding.bounds[2]+focusedBuilding.bounds[3])/2,
   y:focusedBuilding.height+.9,osmVersion:focusedBuilding.osmVersion,tags:focusedBuilding.tags||{},visibleTags:visibleOsmTags(focusedBuilding.tags||{},ignoreRules),source:focusedBuilding
  }:index>=0?entries[index]:null;
  // Both layouts retain every matched OSM POI in a scrollable viewport.
  // A is a single building directory; B renders individual cards and leader lines.
  const ranked=buildingEntry?[{i:-1,item:{...buildingEntry,shopList:shops,shopLayout:shopMode}}]:[];
  let inView=0,shown=0;
  const hostRect=host.getBoundingClientRect();
  debugSvg.replaceChildren();
  for(const viewport of viewports){
   for(const item of viewport.items)if(item)item.el.style.display='none';
   if(viewport.summary)viewport.summary.el.style.display='none';
   const rect=viewport.canvas.getBoundingClientRect();
   if(rect.width<1||rect.height<1)continue;
   const scale=rect.height/(2*tanHalf),occupied=[];
   // Keep labels inside narrow A/B viewports without rebuilding OSM data.
   const widthLimit=Math.max(1,Math.min(210,Math.floor(rect.width-12)));
   const heightLimit=Math.max(1,Math.floor(rect.height-42));
   let viewShown=0;
   for(const {i,item} of ranked){
    // All facility tags of the focused building are candidates in B mode.
    let vx=item.x-ex,vy=item.y-ey,vz=item.z-ez;
    let depth=vx*fx+vy*fy+vz*fz;
    let x=depth>.2?rect.width/2+(vx*rx+vz*rz)*scale/depth:NaN;
    let y=depth>.2?rect.height/2-(vx*ux+vy*uy+vz*uz)*scale/depth:NaN;
    // Very tall buildings can fill the center of the view while their roof
    // anchor is outside it. In that case use the actual visible wall/roof hit.
    if(!(depth>.2&&x>=0&&x<=rect.width&&y>=0&&y<=rect.height)&&focusedHit){
     vx=focusedHit[0]-ex;vy=focusedHit[1]-ey;vz=focusedHit[2]-ez;
     depth=vx*fx+vy*fy+vz*fz;
     if(depth>.2){
      x=rect.width/2+(vx*rx+vz*rz)*scale/depth;
      y=rect.height/2-(vx*ux+vy*uy+vz*uz)*scale/depth;
     }
    }
    if(!(depth>.2&&x>=0&&x<=rect.width&&y>=0&&y<=rect.height))continue;
    let measured;
    if(i===-1){
     const signature=shopMode+'|'+focusedKey+'|'+shops.map(shop=>shop.osmType+':'+shop.osmId+':'+shop.name+':'+(shop.tags?.level??'')).join('|');
     if(viewport.summary?.signature!==signature){
      viewport.summary?.el.remove();
      viewport.summary=createItem(item,widthLimit,heightLimit);
      viewport.summary.signature=signature;
     }
     measured=viewport.summary;
    }else measured=viewport.items[i]||(viewport.items[i]=createItem(item,widthLimit,heightLimit));
    sizeItem(measured,widthLimit,heightLimit);
    const wd=measured.width;
    // Clamp only the HTML card; the 3D position and label data are unchanged.
    const labelX=Math.max(wd/2+4,Math.min(rect.width-wd/2-4,x));
    const labelY=Math.max(measured.height+4,Math.min(rect.height-4,y));
    const top=labelY-measured.height;
    inView++;
    if(measured.height+8>rect.height||wd+8>rect.width||
      occupied.some(p=>labelX-wd/2<p.right+8&&labelX+wd/2>p.left-8&&top<p.bottom+8&&labelY>p.top-8))continue;
    occupied.push({left:labelX-wd/2,right:labelX+wd/2,top,bottom:labelY});
    const el=measured.el;
    el.style.display='flex';
    el.style.left=(rect.left-hostRect.left+labelX)+'px';
    el.style.top=(rect.top-hostRect.top+labelY)+'px';
    drawDebugAnchor(measured,rect,hostRect,x,y,labelX,labelY);
    viewShown++;shown++;
   }
  }
  return {total:entries.length,inRange:ranked.length,inView,shown};
 }
 return {setLabels,appendLabels,setBuildingFeatures,appendBuildingFeatures,setShopMode,reconcileLabels,replaceCanvas,setDebugAnchors,update,hitTest,openHit,dispose(){closeEditor();layer.remove();entries=[];}};
}
