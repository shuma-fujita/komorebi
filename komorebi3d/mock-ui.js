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
import {mountLocalStorageManager} from './local-storage-panel.js?v=auto-release-20261126';
// Initialize the hidden optional panel before the layout parks it.
mountLocalStorageManager(document,{readOnly:true});
mountDefaultPanelLayoutEditor(document);
mountMockTouchInput(document.querySelector('.landscape-game'));


 // Preview the one-tap diagnostic copy interaction before syncing the game UI.
 const logoPanel=document.getElementById('wikidata-logo-status');
 if(logoPanel){
  const copyButton=document.createElement('button');
  copyButton.type='button';
  copyButton.textContent='📋 診断結果をコピー';
  copyButton.style.cssText='display:block;margin-top:8px;padding:7px 12px;border-radius:7px;border:1px solid #799781;background:#e2eddf;color:#20302a;font-weight:700;cursor:pointer';
  const feedback=document.createElement('span');
  feedback.setAttribute('aria-live','polite');
  feedback.style.cssText='display:block;margin-top:4px';
  copyButton.addEventListener('click',async()=>{
   const text=logoPanel.innerText.split('\n').filter(line=>line.trim()&&!line.includes('診断結果をコピー')).join('\n');
   try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
    else{
     const input=document.createElement('textarea');input.value=text;
     input.style.cssText='position:fixed;left:-9999px;top:0';
     document.body.append(input);input.select();
     const ok=document.execCommand('copy');input.remove();
     if(!ok)throw Error('コピーできませんでした');
    }
    feedback.textContent='コピーしました';
   }catch{feedback.textContent='コピーに失敗しました。Safariの共有・選択操作をご利用ください。';}
  });
  logoPanel.append(copyButton,feedback);
 }
