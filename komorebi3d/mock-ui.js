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
import {mountLocalStorageManager} from './local-storage-panel.js?v=storage-id-inline-search-20261122';
// Initialize the hidden optional panel before the layout parks it.
mountLocalStorageManager(document);
mountDefaultPanelLayoutEditor(document);
mountMockTouchInput(document.querySelector('.landscape-game'));

