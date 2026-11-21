// Building editor bottom sheet: the sole writer of sheet positioning.
// The grip owns drag transitions, while keyboard geometry is an input to
// this controller rather than a second module changing the same CSS.
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from './building-editor-layout.js?v=ratio-centered-20261121';

export function sheetGeometry(panelHeight,mode,viewportHeight=null,gameTop=0){
 const height=Math.max(1,panelHeight);
 const top=mode==='full'?0:height*BUILDING_PREVIEW_RATIO;
 const natural=mode==='full'?height:height*BUILDING_SHEET_RATIO;
 const available=viewportHeight===null?height:Math.max(0,viewportHeight-Math.max(0,gameTop));
 return {top,height:Math.max(0,Math.min(natural,available-top))};
}

export function attachSheetMotion(sheet,handle,onDismiss,onModeChange=null){
 const SAMPLE_WINDOW=110,DISMISS_DISTANCE=90,FLICK_VELOCITY=.55;
 const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 let mode='half',drag=null,animation=null,disposed=false,dismissing=false;
 let viewportHeight=null,gameTop=0;
 const panelHeight=()=>Math.max(1,sheet.parentElement?.getBoundingClientRect().height||sheet.clientHeight*2||1);
 const geometry=target=>sheetGeometry(panelHeight(),target,viewportHeight,gameTop);
 function stopAnimation(){
  if(animation){animation.cancel();animation=null;}
 }
 function drawSettled(){
  const g=geometry(mode);
  sheet.style.position=viewportHeight===null?'relative':'absolute';
  sheet.style.top=viewportHeight===null?'':g.top+'px';
  sheet.style.bottom=viewportHeight===null?'':'auto';
  const value=viewportHeight===null?(mode==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%'):Math.max(1,g.height)+'px';
  sheet.style.height=value;sheet.style.maxHeight=value;
  sheet.style.transform='';
 }
 // During a drag the sheet follows the pointer. When a keyboard is visible,
 // the same calculation clips the sheet to the game's *visible* region.
 function drawDrag(top,below=0){
  const gameH=panelHeight(),minTop=Math.min(top,gameH*BUILDING_PREVIEW_RATIO);
  const available=viewportHeight===null?gameH:Math.max(0,viewportHeight-Math.max(0,gameTop));
  const visible=Math.max(1,Math.min(gameH-minTop,available-minTop));
  sheet.style.position=viewportHeight===null?'relative':'absolute';
  sheet.style.top=viewportHeight===null?'':minTop+'px';
  sheet.style.bottom=viewportHeight===null?'':'auto';
  sheet.style.maxHeight='100%';
  sheet.style.height=visible+'px';
  sheet.style.transform=below>0?'translateY('+below+'px)':'';
 }
 function settle(target,fromHeight,fromOffset=0,velocity=0,fromTop=null){
  stopAnimation();
  const next=geometry(target==='dismiss'?'half':target);
  const toOffset=target==='dismiss'
   ?Math.max(panelHeight()*BUILDING_SHEET_RATIO+24,fromOffset+panelHeight()*BUILDING_SHEET_RATIO):0;
  const duration=target==='dismiss'
   ?Math.max(140,Math.min(300,panelHeight()/Math.max(1,Math.abs(velocity)*2))):250;
  if(reducedMotion()||typeof sheet.animate!=='function'){
   if(target==='dismiss'){if(!disposed)onDismiss();return;}
   mode=target;drawSettled();onModeChange?.(mode);return;
  }
  const startTop=viewportHeight===null?null:(fromTop??geometry(mode).top);
  const frames=[
   {height:fromHeight+'px',transform:'translateY('+fromOffset+'px)',...(startTop===null?{}:{top:startTop+'px'})},
   {height:Math.max(1,next.height)+'px',transform:'translateY('+toOffset+'px)',...(startTop===null?{}:{top:next.top+'px'})}
  ];
  // Keep the current drag geometry until the animation completes.
  const current=sheet.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  animation=current;
  current.finished.then(()=>{
   if(disposed||animation!==current)return;
   animation=null;
   current.cancel();
   if(target==='dismiss'){onDismiss();return;}
   mode=target;drawSettled();onModeChange?.(mode);
  },()=>{});
 }
 function onPointerDown(event){
  if(disposed||dismissing||drag||!event.isPrimary||event.button!==0)return;
  if(animation){
   const rect=sheet.getBoundingClientRect();
   stopAnimation();
   const parent=sheet.parentElement.getBoundingClientRect();
   mode=rect.top-parent.top<parent.height*.25?'full':'half';
   drawSettled();
  }
  const gameH=panelHeight(),baseTop=mode==='full'?0:gameH*BUILDING_PREVIEW_RATIO;
  drag={id:event.pointerId,startY:event.clientY,baseTop,top:baseTop,screenHeight:gameH,
   samples:[{y:event.clientY,t:performance.now()}]};
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();event.stopPropagation();
 }
 function onPointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const now=performance.now(),mid=drag.screenHeight*BUILDING_PREVIEW_RATIO;
  drag.top=Math.max(0,Math.min(drag.screenHeight+.2*mid,drag.baseTop+event.clientY-drag.startY));
  const below=Math.max(0,drag.top-mid);
  drawDrag(drag.top,below);
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
  const mid=state.screenHeight*BUILDING_PREVIEW_RATIO,top=state.top;
  const displacement=top-state.baseTop;
  const currentTop=Math.min(top,mid),below=Math.max(0,top-mid);
  const available=viewportHeight===null?state.screenHeight:Math.max(0,viewportHeight-Math.max(0,gameTop));
  const visible=Math.max(1,Math.min(state.screenHeight-currentTop,available-currentTop));
  let target=mode;
  if(!cancelled){
   if(top>=mid+DISMISS_DISTANCE||
     (mode==='half'&&displacement>12&&velocity>=FLICK_VELOCITY))target='dismiss';
   else if(mode==='half'&&(displacement< -56||(displacement< -12&&velocity<=-FLICK_VELOCITY)))target='full';
   else if(mode==='full'&&(displacement>65||(displacement>12&&velocity>=FLICK_VELOCITY)))target='half';
  }
  if(target==='dismiss')dismissing=true;
  settle(target,visible,below,velocity,currentTop);
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
   if(viewportHeight===next&&gameTop===top)return;
   viewportHeight=next;gameTop=top;
   if(animation)stopAnimation();
   if(drag)drag=null;
   drawSettled();
  },
  destroy(){
   if(disposed)return;
   disposed=true;drag=null;
   stopAnimation();
   handle.removeEventListener('pointerdown',onPointerDown);
   handle.removeEventListener('pointermove',onPointerMove);
   handle.removeEventListener('pointerup',onPointerUp);
   handle.removeEventListener('pointercancel',onPointerCancel);
  }
 };
}
