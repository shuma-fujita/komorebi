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

import {mountDefaultPanelLayoutEditor} from './dev-panel-layout.js?v=shared-initializer-20261117';
mountDefaultPanelLayoutEditor(document);
mountMockTouchInput(document.querySelector('.landscape-game'));

