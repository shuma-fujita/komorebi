// Three-stop OSM bottom sheet (70%, full, dismiss).
// The sheet belongs to the game panel; keyboard events never resize it.
// Only the grip owns dragging, while the form keeps native content scrolling.
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from './building-editor-layout.js?v=ratio-centered-20261121';

export function attachSheetMotion(sheet,handle,onDismiss,onModeChange=null){
 const SAMPLE_WINDOW=110,DISMISS_DISTANCE=90,FLICK_VELOCITY=.55;
 const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 let mode='half',drag=null,animation=null,disposed=false,dismissing=false;
 const panelHeight=()=>Math.max(1,sheet.parentElement?.getBoundingClientRect().height||sheet.clientHeight*2||1);
 function stopAnimation(){
  if(animation){animation.cancel();animation=null;}
 }
 function cancelDrag(){
  if(!drag)return;
  const id=drag.id;drag=null;
  if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id);
 }
 function drawSettled(){
  sheet.style.position='relative';
  sheet.style.top='';sheet.style.bottom='';
  const height=mode==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheet.style.height=height;sheet.style.maxHeight=height;
  sheet.style.transform='';
 }
 function drawDrag(visibleHeight,below=0){
  sheet.style.position='relative';
  sheet.style.top='';sheet.style.bottom='';
  sheet.style.maxHeight='100%';
  sheet.style.height=Math.max(1,visibleHeight)+'px';
  sheet.style.transform=below>0?'translateY('+below+'px)':'';
 }
 function settle(target,fromHeight,fromOffset=0,velocity=0){
  stopAnimation();
  const gameHeight=panelHeight(),halfHeight=gameHeight*BUILDING_SHEET_RATIO;
  const targetHeight=target==='full'?gameHeight:halfHeight;
  const toOffset=target==='dismiss'?
   Math.max(halfHeight+24,fromOffset+halfHeight):0;
  const duration=target==='dismiss'?
   Math.max(140,Math.min(300,gameHeight/Math.max(1,Math.abs(velocity)*2))):250;
  if(reducedMotion()||typeof sheet.animate!=='function'){
   if(target==='dismiss'){if(!disposed)onDismiss();return;}
   mode=target;drawSettled();onModeChange?.(mode);return;
  }
  drawDrag(fromHeight,fromOffset);
  const frames=[
   {height:fromHeight+'px',transform:'translateY('+fromOffset+'px)'},
   {height:targetHeight+'px',transform:'translateY('+toOffset+'px)'}
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
   mode=visual.top-parent.top<parent.height*.25?'full':'half';
   drawSettled();
  }
  const gameHeight=panelHeight(),baseTop=mode==='full'?0:gameHeight*BUILDING_PREVIEW_RATIO;
  drag={id:event.pointerId,startY:event.clientY,baseTop,top:baseTop,gameHeight,
   samples:[{y:event.clientY,t:performance.now()}]};
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();event.stopPropagation();
 }
 function onPointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const now=performance.now(),mid=drag.gameHeight*BUILDING_PREVIEW_RATIO;
  drag.top=Math.max(0,Math.min(drag.gameHeight+mid*.2,drag.baseTop+event.clientY-drag.startY));
  drawDrag(drag.gameHeight-Math.min(drag.top,mid),Math.max(0,drag.top-mid));
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
  const mid=state.gameHeight*BUILDING_PREVIEW_RATIO,top=state.top;
  const displacement=top-state.baseTop;
  const visibleHeight=state.gameHeight-Math.min(top,mid),below=Math.max(0,top-mid);
  let target=mode;
  if(!cancelled){
   if(top>=mid+DISMISS_DISTANCE||
     (mode==='half'&&displacement>12&&velocity>=FLICK_VELOCITY))target='dismiss';
   else if(mode==='half'&&(displacement< -56||(displacement< -12&&velocity<=-FLICK_VELOCITY)))target='full';
   else if(mode==='full'&&(displacement>65||(displacement>12&&velocity>=FLICK_VELOCITY)))target='half';
  }
  if(target==='dismiss')dismissing=true;
  settle(target,visibleHeight,below,velocity);
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
