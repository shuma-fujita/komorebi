// Mock-only UI demo. No engine, WebGL, map or 3D imports.
import {mountTestControlsPanel,mountMockTouchInput} from './dev-panel-components.js?v=shop-list-desc-mock-20261119';
/* Mock-only: reflect the display mode in the black game surface. */
function renderFauxGame(state){
 const surface=document.getElementById('play-surface');
 if(!surface)return;
 const mode=state.renderMode;
 const names={map:{old:'旧2km',new:'新2km'},engine:{A:'WebGL',B:'Three.js'}};
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

// The game mock is a simple black-green A/B placeholder; no OSM editor overlays.

import {mountDefaultPanelLayoutEditor} from './dev-panel-layout.js?v=storage-four-slots-20261122';
import {mountLocalStorageManager} from './local-storage-panel.js?v=storage-name-readonly-v1-20261123';
// Initialize the hidden optional panel before the layout parks it.
mountLocalStorageManager(document,{readOnly:true});
mountDefaultPanelLayoutEditor(document);
mountMockTouchInput(document.querySelector('.landscape-game'));


// Mock-only sample for the tag format warning; no OSM access or game engine.
import {syncLevelFormatWarning} from './maps/osm-level-warning.js?v=level-format-v1-20261124';
const warningHost=document.querySelector('#test-ops-panel');
if(warningHost){
 const sample=document.createElement('div');
 sample.style.cssText='margin:12px 0;padding:10px;border:1px solid #6f9085;border-radius:8px;background:#243a35;color:#fff;';
 const heading=document.createElement('strong');heading.textContent='タグ書式警告（UI確認用）';
 const row=document.createElement('div');row.className='komo-tag-row';
 row.style.cssText='display:grid;grid-template-columns:1fr 2fr;gap:6px;margin-top:8px;';
 const key=document.createElement('input'),value=document.createElement('input');
 key.value='level';key.readOnly=true;value.value='1;2;3;';
 key.setAttribute('aria-label','タグ名');value.setAttribute('aria-label','タグの値');
 for(const input of [key,value])input.style.cssText='min-width:0;width:100%;box-sizing:border-box;padding:6px;';
 row.append(key,value);sample.append(heading,row);warningHost.appendChild(sample);
 row.addEventListener('input',()=>syncLevelFormatWarning(row));syncLevelFormatWarning(row);
}
