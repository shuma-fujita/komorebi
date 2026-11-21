// Mock-only UI demo. No engine, WebGL, map or 3D imports.
import {mountTestControlsPanel,mountMockTouchInput} from './dev-panel-components.js?v=shop-list-desc-mock-20261119';
/* Mock-only: reflect the display mode in the black game surface. */
function renderFauxGame(state){
 const surface=document.getElementById('play-surface');
 if(!surface)return;
 const mode=state.renderMode;
 const names={map:{old:'旧2km',new:'新2km（Geofabrik）'},engine:{A:'WebGL',B:'Three.js'}};
 const shown=mode==='compare'?['A','B']:[mode];
 surface.classList.toggle('ab-compare',mode==='compare');
 surface.replaceChildren();
 for(const s of shown){
  const v=document.createElement('div');v.className='screen-view';
  const tag=document.createElement('span');tag.className='screen-tag';tag.textContent='画面'+s;
  const body=document.createElement('div');
  body.textContent='🌳 描画なし';
  const sm=document.createElement('small');
  sm.textContent=names.engine[state.screens[s].engine]+' / '+names.map[state.screens[s].map];
  body.appendChild(sm);v.append(tag,body);surface.appendChild(v);
 }
}
(function(){
 const panel=document.querySelector('#test-ops-panel');
 if(!panel)return;
 // The same controls run locally without a Game API; only the game image is fake.
 mountTestControlsPanel(panel,null);
 const readState=()=>{
  const renderMode=panel.querySelector('[data-mode][aria-pressed="true"]')?.dataset.mode||'compare';
  const screens={};
  for(const screen of ['A','B']){
   screens[screen]={};
   for(const kind of ['map','engine']){
    screens[screen][kind]=panel.querySelector('[data-screen="'+screen+'"] [data-setting="'+kind+'"] input:checked')?.value||(kind==='map'?'new':'B');
   }
  }
  return {renderMode,screens};
 };
 const update=()=>renderFauxGame(readState());
 panel.addEventListener('click',event=>{if(event.target.closest('[data-mode]'))update();});
 panel.addEventListener('change',event=>{if(event.target.closest('.screen-settings input'))update();});
 update();
})();

// Mock-first visual review for Step 3. No map loading, WebGL, localStorage,
// production writes or simulated save-success events.
import {applyBuildingTagEditorTheme} from './maps/building-tag-editor-theme.js?v=copy-auth-error-under-action-20261121';
import {applyPendingTagVisualStyle,syncPendingTagRows} from './maps/osm-pending-tag-visual.js?v=step3-mock-20261122';
import {hasOsmTagChanges,buildOsmTagReview} from './maps/osm-tag-review.js?v=production-preview-20261122';

(function mountPendingTagPreview(){
 const panel=document.querySelector('#test-ops-panel .test-panel-body');
 const game=document.querySelector('.landscape-game');
 if(!panel||!game)return;
 const label=document.createElement('div');
 label.className='test-section-title';
 label.textContent='🏷️ ビルタグ反映待ち（表示サンプル）';
 const launch=document.createElement('button');
 launch.type='button';launch.textContent='黄色の反映待ち表示を確認';
 launch.style.cssText='width:100%;min-height:44px;';
 const note=document.createElement('p');
 note.style.cssText='font-size:11px;line-height:1.6;margin:5px 0 0;color:inherit;';
 note.textContent='保存・送信はしません。新2kmのビルタグ画面の見た目だけ確認できます。';
 const separator=document.createElement('div');separator.className='test-separator';
 panel.prepend(separator);
 panel.prepend(note);
 panel.prepend(launch);
 panel.prepend(label);
 launch.addEventListener('click',()=>{
  game.querySelector('.komo-pending-mock-overlay')?.remove();
  const mask=document.createElement('div');
  mask.className='komo-pending-mock-overlay';
  mask.style.cssText='position:absolute;inset:0;z-index:8;display:flex;align-items:flex-end;justify-content:center;background:rgba(8,18,25,.23);pointer-events:auto;';
  const form=document.createElement('section');
  form.style.cssText='box-sizing:border-box;width:100%;height:70%;max-height:70%;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:0 16px 18px;border-radius:18px 18px 0 0;font:14px/1.5 system-ui,-apple-system,sans-serif;';
  const grip=document.createElement('div');grip.style.cssText='display:flex;align-items:center;justify-content:center;height:36px;background:#152c26;margin:0 -16px 6px;border-radius:18px 18px 0 0;';
  const handle=document.createElement('span');handle.className='komo-grip';handle.style.cssText='width:44px;height:5px;border-radius:20px;';
  grip.appendChild(handle);
  const heading=document.createElement('div');heading.className='komo-editor-header';
  const titles=document.createElement('div');titles.className='komo-editor-heading';
  const h3=document.createElement('h3');h3.textContent='建物（表示サンプル）';
  const sub=document.createElement('p');sub.className='komo-editor-subtitle';
  sub.textContent='建物（OSMタグ）・新2km（Geofabrik）';
  titles.append(h3,sub);
  const close=document.createElement('button');
  close.type='button';close.className='komo-editor-close';close.textContent='×';
  close.setAttribute('aria-label','サンプルを閉じる');
  close.addEventListener('click',()=>mask.remove());
  heading.append(titles,close);
  const metadata=document.createElement('p');metadata.textContent='OSM way/123456 ／ version: 9（サンプル）';
  metadata.style.cssText='font:11px/1.5 system-ui;color:#9bb5a8;margin:5px 0 12px;';
  const caption=document.createElement('p');caption.className='komo-caption';
  caption.textContent='◇ タグ（3件）';
  const rows=document.createElement('div');rows.setAttribute('aria-label','OSMタグ一覧（表示サンプル）');
  for(const [key,value] of [['name','サンプルビル'],['building:levels','5'],['building','yes']]){
   const row=document.createElement('div');row.className='komo-tag-row';
   for(const [valueText,aria] of [[key,'タグ名'],[value,'タグの値']]){
    const input=document.createElement('input');
    input.value=valueText;input.readOnly=true;
    input.setAttribute('aria-label',aria);
    row.appendChild(input);
   }
   rows.appendChild(row);
  }
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='komo-action';
  let pendingVisible=true;
  const refresh=()=>{
   syncPendingTagRows(rows,{
    mapSource:'new',dataSource:'production',
    pending:pendingVisible?{changes:{'building:levels':'5'}}:null
   });
   toggle.textContent=pendingVisible?'通常表示と比較する':'反映待ち表示に戻す';
  };
  toggle.addEventListener('click',()=>{pendingVisible=!pendingVisible;refresh();});
  const description=document.createElement('p');
  description.className='komo-status';
  description.textContent='表示サンプルです。localStorageやOSM本番には書き込みません。';
  form.append(grip,heading,metadata,caption,rows,description,toggle);
  applyBuildingTagEditorTheme(form);
  applyPendingTagVisualStyle(form);
  refresh();
  mask.appendChild(form);
  mask.addEventListener('click',event=>{if(event.target===mask)mask.remove();});
  game.appendChild(mask);
 });
})();


// Preview of the existing editor's production-source draft/review controls.
// Shared validation module, no API, localStorage or "save success" simulation.
(function mountProductionTagDraftDemo(){
 const panel=document.querySelector('#test-ops-panel .test-panel-body');
 const game=document.querySelector('.landscape-game');
 if(!panel||!game)return;
 const heading=document.createElement('div');heading.className='test-section-title';
 heading.textContent='📝 本番タグ編集（送信なし）';
 const launch=document.createElement('button');launch.type='button';
 launch.textContent='タグ追加・変更内容確認を試す';
 launch.style.cssText='width:100%;min-height:44px';
 const tip=document.createElement('p');tip.textContent='サンプルの編集・JSON確認のみ。本番OSMには送信・保存しません。';
 tip.style.cssText='font:11px/1.6 system-ui;margin:5px 0 0';
 const divider=document.createElement('div');divider.className='test-separator';
 panel.prepend(divider);panel.prepend(tip);panel.prepend(launch);panel.prepend(heading);

 launch.addEventListener('click',()=>{
  game.querySelector('.komo-draft-mock-overlay')?.remove();
  game.querySelector('.komo-pending-mock-overlay')?.remove();
  const mask=document.createElement('div');mask.className='komo-draft-mock-overlay';
  mask.style.cssText='position:absolute;inset:0;z-index:9;display:flex;align-items:flex-end;justify-content:center;background:rgba(8,18,25,.23);pointer-events:auto';
  const form=document.createElement('section');
  form.style.cssText='box-sizing:border-box;width:100%;height:70%;max-height:70%;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:0 16px 18px;border-radius:18px 18px 0 0;font:14px/1.5 system-ui,-apple-system,sans-serif';
  const grip=document.createElement('div');grip.style.cssText='display:flex;align-items:center;justify-content:center;height:36px;background:#152c26;margin:0 -16px 6px;border-radius:18px 18px 0 0';
  const handle=document.createElement('span');handle.className='komo-grip';handle.style.cssText='width:44px;height:5px;border-radius:20px';grip.appendChild(handle);
  const header=document.createElement('div');header.className='komo-editor-header';
  const titles=document.createElement('div');titles.className='komo-editor-heading';
  const title=document.createElement('h3');title.textContent='建物（表示サンプル）';
  const subtitle=document.createElement('p');subtitle.className='komo-editor-subtitle';subtitle.textContent='本番OSM（確認画面まで）';
  titles.append(title,subtitle);
  const close=document.createElement('button');close.type='button';close.className='komo-editor-close';close.textContent='×';close.setAttribute('aria-label','閉じる');
  close.addEventListener('click',()=>mask.remove());header.append(titles,close);
  const note=document.createElement('p');note.className='komo-status';
  note.textContent='本番OSMのタグを編集・追加して変更内容を確認できます。この画面から本番OSMへの送信・保存は行いません。';
  const metadata=document.createElement('p');metadata.textContent='OSM way/123456 ／ version: 9（サンプル）';
  metadata.style.cssText='font:11px/1.5 system-ui;color:#9bb5a8;margin:5px 0 10px';
  const caption=document.createElement('p');caption.className='komo-caption';
  const rows=document.createElement('div');rows.setAttribute('aria-label','OSMタグ一覧（サンプル）');
  const originalTags={name:'サンプルビル','building:levels':'4',building:'yes'};
  function addRow(key='',value=''){
   const row=document.createElement('div');row.className='komo-tag-row';
   const k=document.createElement('input');k.value=key;k.placeholder='タグ名';k.readOnly=Boolean(key);k.setAttribute('aria-label','タグ名');
   const v=document.createElement('input');v.value=value;v.placeholder='値';v.setAttribute('aria-label','タグの値');
   if(key)k.addEventListener('click',()=>v.focus({preventScroll:true}));
   row.append(k,v);rows.appendChild(row);
  }
  for(const [key,value] of Object.entries(originalTags))addRow(key,value);
  const updateCaption=()=>{caption.textContent='◇ タグ（'+rows.children.length+'件）';};
  updateCaption();
  const add=document.createElement('button');add.type='button';add.className='komo-add-tag';add.textContent='＋ タグを追加';
  const error=document.createElement('p');error.style.cssText='color:#ffb0a5;font:12px/1.5 system-ui;min-height:1em';
  const confirm=document.createElement('button');confirm.type='button';confirm.className='komo-action';confirm.textContent='変更内容を確認';
  const review=document.createElement('div');review.className='komo-review';review.hidden=true;
  const reviewTitle=document.createElement('p');reviewTitle.textContent='JSON変更内容の確認（OSM未送信）';
  const json=document.createElement('pre');json.style.cssText='max-height:40vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#10271f;color:#e6f5ed;font:12px/1.5 ui-monospace,monospace';
  const notice=document.createElement('p');notice.className='komo-status';notice.textContent='確認用の下書きです。本番OSMには送信・保存していません。';
  review.append(reviewTitle,json,notice);
  const back=document.createElement('button');back.type='button';back.className='komo-action komo-action-secondary';back.textContent='編集に戻る';back.hidden=true;
  const rowsData=()=>[...rows.children].map(row=>({key:row.children[0].value,value:row.children[1].value}));
  function update(){
   const draft=Object.create(null);
   for(const {key,value} of rowsData())if(key.trim())draft[key.trim()]=value;
   confirm.hidden=!hasOsmTagChanges(originalTags,draft);
  }
  rows.addEventListener('input',()=>{error.textContent='';update();});
  add.addEventListener('click',()=>{addRow();updateCaption();update();rows.lastElementChild.firstElementChild.focus({preventScroll:true});});
  confirm.addEventListener('click',()=>{
   try{
    const result=buildOsmTagReview({osm:{type:'way',id:'123456',version:9},originalTags,rows:rowsData()});
    json.textContent=JSON.stringify(result,null,2);
    rows.hidden=true;caption.hidden=true;add.hidden=true;confirm.hidden=true;review.hidden=false;back.hidden=false;note.hidden=true;
    error.textContent='';
   }catch(e){error.textContent=e.message;}
  });
  back.addEventListener('click',()=>{rows.hidden=false;caption.hidden=false;add.hidden=false;review.hidden=true;back.hidden=true;note.hidden=false;update();});
  form.append(grip,header,note,metadata,caption,rows,add,error,confirm,review,back);
  applyBuildingTagEditorTheme(form);
  update();
  mask.appendChild(form);game.appendChild(mask);
  mask.addEventListener('click',event=>{if(event.target===mask)mask.remove();});
 });
})();

import {mountDefaultPanelLayoutEditor} from './dev-panel-layout.js?v=shared-initializer-20261117';
mountDefaultPanelLayoutEditor(document);
mountMockTouchInput(document.querySelector('.landscape-game'));

