// The building sheet is anchored to the game panel, never the document.
// It is the sole writer of sheet and preview-grip positioning. During
// keyboard input the visible intersection of panel and VisualViewport is
// partitioned into preview + editable sheet; nothing escapes the panel.
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from './building-editor-layout.js?v=ratio-centered-20261121';

export const MIN_KEYBOARD_INPUT_HEIGHT=96;

export function panelVisibleRange(panelHeight,viewportHeight=null,panelTop=0){
 const height=Math.max(1,panelHeight);
 if(viewportHeight===null)return {start:0,end:height,height};
 // panelTop is the panel's top in visual-viewport coordinates.
 const start=Math.min(height,Math.max(0,-panelTop));
 const end=Math.max(start,Math.min(height,viewportHeight-panelTop));
 return {start,end,height:end-start};
}

export function sheetGeometry(panelHeight,mode,viewportHeight=null,panelTop=0){
 const panelH=Math.max(1,panelHeight);
 if(viewportHeight===null){
  return mode==='full'?{top:0,height:panelH}:
   {top:panelH*BUILDING_PREVIEW_RATIO,height:panelH*BUILDING_SHEET_RATIO};
 }
 const visible=panelVisibleRange(panelH,viewportHeight,panelTop);
 if(mode==='full')return {top:visible.start,height:visible.height};
 // Preserve 30% of the full game canvas whenever a usable input field fits.
 // On very small screens the input field wins rather than becoming unusable.
 const preview=Math.min(panelH*BUILDING_PREVIEW_RATIO,
  Math.max(0,visible.height-MIN_KEYBOARD_INPUT_HEIGHT));
 return {top:visible.start+preview,height:visible.height-preview};
}

export function attachSheetMotion(sheet,handle,onDismiss,onModeChange=null,
 {previewTouch=null,onPreviewRegionChange=null}={}){
 const SAMPLE_WINDOW=110,DISMISS_DISTANCE=90,FLICK_VELOCITY=.55;
 const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 let mode='half',drag=null,animation=null,disposed=false,dismissing=false;
 let viewportHeight=null,panelTop=0;
 let lastPreviewKey='';
 const panelHeight=()=>Math.max(1,sheet.parentElement?.getBoundingClientRect().height||sheet.clientHeight*2||1);
 const geometry=target=>sheetGeometry(panelHeight(),target,viewportHeight,panelTop);
 const region=()=>panelVisibleRange(panelHeight(),viewportHeight,panelTop);
 const keyboardActive=()=>viewportHeight!==null;

 function emitPreview(sheetTop){
  const visible=region(),H=panelHeight();
  const start=visible.start,previewHeight=Math.max(0,sheetTop-start);
  if(previewTouch){
   previewTouch.style.top=keyboardActive()?start+'px':'0';
   previewTouch.style.height=keyboardActive()?previewHeight+'px':
    (mode==='full'?'0':(BUILDING_PREVIEW_RATIO*100)+'%');
  }
  // Quantize tiny iOS scroll noise to avoid excessive camera updates.
  const key=Math.round(start*4)+'|'+Math.round(previewHeight*4)+'|'+Math.round(H*4);
  if(key!==lastPreviewKey){
   lastPreviewKey=key;
   onPreviewRegionChange?.({startRatio:start/H,heightRatio:previewHeight/H});
  }
 }
 function stopAnimation(){
  if(animation){animation.cancel();animation=null;}
 }
 function cancelDrag(){
  if(!drag)return;
  const id=drag.id;drag=null;
  if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id);
 }
 function drawSettled(){
  const g=geometry(mode);
  sheet.style.position=keyboardActive()?'absolute':'relative';
  sheet.style.top=keyboardActive()?g.top+'px':'';
  sheet.style.bottom=keyboardActive()?'auto':'';
  const value=keyboardActive()?Math.max(1,g.height)+'px':
   (mode==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%');
  sheet.style.height=value;sheet.style.maxHeight=value;
  sheet.style.transform='';
  emitPreview(g.top);
 }
 function drawDrag(top){
  const mid=geometry('half').top,visible=region();
  const effectiveTop=Math.min(top,mid),below=Math.max(0,top-mid);
  const visibleHeight=Math.max(1,visible.end-effectiveTop);
  sheet.style.position=keyboardActive()?'absolute':'relative';
  sheet.style.top=keyboardActive()?effectiveTop+'px':'';
  sheet.style.bottom=keyboardActive()?'auto':'';
  sheet.style.maxHeight=keyboardActive()?visibleHeight+'px':'100%';
  sheet.style.height=visibleHeight+'px';
  sheet.style.transform=below>0?'translateY('+below+'px)':'';
  emitPreview(effectiveTop);
 }
 function settle(target,fromHeight,fromOffset=0,velocity=0,fromTop=null){
  stopAnimation();
  const next=geometry(target==='dismiss'?'half':target);
  const mid=geometry('half'),nextHeight=Math.max(1,next.height);
  const toOffset=target==='dismiss'?
   Math.max(mid.height+24,fromOffset+mid.height):0;
  const duration=target==='dismiss'?
   Math.max(140,Math.min(300,panelHeight()/Math.max(1,Math.abs(velocity)*2))):250;
  if(reducedMotion()||typeof sheet.animate!=='function'){
   if(target==='dismiss'){if(!disposed)onDismiss();return;}
   mode=target;drawSettled();onModeChange?.(mode);return;
  }
  const startTop=keyboardActive()?(fromTop??geometry(mode).top):null;
  const frames=[
   {height:fromHeight+'px',transform:'translateY('+fromOffset+'px)',...(startTop===null?{}:{top:startTop+'px'})},
   {height:nextHeight+'px',transform:'translateY('+toOffset+'px)',...(startTop===null?{}:{top:next.top+'px'})}
  ];
  const current=sheet.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  animation=current;
  current.finished.then(()=>{
   if(disposed||animation!==current)return;
   animation=null;current.cancel();
   if(target==='dismiss'){onDismiss();return;}
   mode=target;drawSettled();onModeChange?.(mode);
  },()=>{});
 }
 function onPointerDown(event){
  if(disposed||dismissing||drag||!event.isPrimary||event.button!==0)return;
  if(animation){
   const visual=sheet.getBoundingClientRect();
   stopAnimation();
   const parent=sheet.parentElement.getBoundingClientRect();
   const visible=region(),split=geometry('half').top;
   // Preserve the old 25%-of-panel interruption threshold in normal mode.
   // Shift it with the visible panel slice while the keyboard is open.
   const threshold=visible.start+(split-visible.start)*5/6;
   mode=visual.top-parent.top<threshold?'full':'half';
   drawSettled();
  }
  const baseTop=geometry(mode).top;
  drag={id:event.pointerId,startY:event.clientY,baseTop,top:baseTop,
   samples:[{y:event.clientY,t:performance.now()}]};
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();event.stopPropagation();
 }
 function onPointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const now=performance.now(),halfTop=geometry('half').top;
  const available=Math.max(1,region().height);
  drag.top=Math.max(region().start,
   Math.min(halfTop+available*.2,drag.baseTop+event.clientY-drag.startY));
  drawDrag(drag.top);
  drag.samples.push({y:event.clientY,t:now});
  while(drag.samples.length>2&&now-drag.samples[0].t>SAMPLE_WINDOW)drag.samples.shift();
  event.preventDefault();event.stopPropagation();
 }
 function endDrag(event,cancelled=false){
  if(!drag||event.pointerId!==drag.id)return;
  const state=drag;drag=null;
  if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
  const samples=state.samples,first=samples[0],last=samples[samples.length-1];
  const velocity=(last.y-first.y)/Math.max(1,last.t-first.t);
  const mid=geometry('half').top,top=state.top,displacement=top-state.baseTop;
  const effectiveTop=Math.min(top,mid),below=Math.max(0,top-mid);
  const visibleHeight=Math.max(1,region().end-effectiveTop);
  let target=mode;
  if(!cancelled){
   if(top>=mid+DISMISS_DISTANCE||
     (mode==='half'&&displacement>12&&velocity>=FLICK_VELOCITY))target='dismiss';
   else if(mode==='half'&&(displacement< -56||(displacement< -12&&velocity<=-FLICK_VELOCITY)))target='full';
   else if(mode==='full'&&(displacement>65||(displacement>12&&velocity>=FLICK_VELOCITY)))target='half';
  }
  if(target==='dismiss')dismissing=true;
  settle(target,visibleHeight,below,velocity,effectiveTop);
  event.preventDefault();event.stopPropagation();
 }
 const onPointerUp=event=>endDrag(event);
 const onPointerCancel=event=>endDrag(event,true);
 handle.addEventListener('pointerdown',onPointerDown);
 handle.addEventListener('pointermove',onPointerMove);
 handle.addEventListener('pointerup',onPointerUp);
 handle.addEventListener('pointercancel',onPointerCancel);
 drawSettled();
 return {
  toggle(){if(disposed||dismissing||drag)return;settle(mode==='full'?'half':'full',sheet.getBoundingClientRect().height);},
  getMode(){return mode;},
  setKeyboardViewport(height,top=0){
   if(disposed)return;
   const next=height===null?null:Math.max(0,height);
   if(viewportHeight===next&&Math.abs(panelTop-top)<.25)return;
   viewportHeight=next;panelTop=top;
   if(animation)stopAnimation();
   cancelDrag();drawSettled();
  },
  destroy(){
   if(disposed)return;
   disposed=true;cancelDrag();stopAnimation();
   handle.removeEventListener('pointerdown',onPointerDown);
   handle.removeEventListener('pointermove',onPointerMove);
   handle.removeEventListener('pointerup',onPointerUp);
   handle.removeEventListener('pointercancel',onPointerCancel);
  }
 };
}
