// Native-feeling bottom-sheet drag physics. No animation dependency.
// This module only owns the grip gesture and sheet transform; callers own UI state.
export function attachSheetMotion(sheet,handle,onDismiss){
 const DISMISS_DISTANCE=90,FLICK_VELOCITY=.55; // px, px/ms
 const SAMPLE_WINDOW=110;
 const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 let drag=null,animation=null,disposed=false,dismissing=false;
 const cancelAnimation=()=>{
  if(animation){animation.cancel();animation=null;}
  sheet.style.transform='';
 };
 function animateTo(keyframes,duration,done){
  if(reducedMotion()||!sheet.animate){done();return;}
  animation=sheet.animate(keyframes,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  const running=animation;
  running.finished.then(()=>{if(disposed||animation!==running)return;animation=null;done();},()=>{});
 }
 function reset(distance){
  sheet.style.transform='';
  if(disposed)return;
  if(distance<1||reducedMotion())return;
  animateTo([
   {transform:'translateY('+distance+'px)',offset:0},
   {transform:'translateY(-7px)',offset:.76},
   {transform:'translateY(0px)',offset:1}
  ],260,()=>{sheet.style.transform='';});
 }
 function onPointerDown(event){
  if(disposed||dismissing||drag||!event.isPrimary||event.button!==0)return;
  cancelAnimation();
  drag={id:event.pointerId,start:event.clientY,offset:0,samples:[{y:event.clientY,t:performance.now()}]};
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();event.stopPropagation();
 }
 function onPointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const now=performance.now();
  const distance=Math.max(0,event.clientY-drag.start);
  drag.offset=distance;
  drag.samples.push({y:event.clientY,t:now});
  while(drag.samples.length>2&&now-drag.samples[0].t>SAMPLE_WINDOW)drag.samples.shift();
  sheet.style.transform='translateY('+distance+'px)';
  event.preventDefault();event.stopPropagation();
 }
 function endDrag(event,cancelled=false){
  if(!drag||event.pointerId!==drag.id)return;
  const {offset,samples}=drag;
  drag=null;
  if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
  const last=samples[samples.length-1],first=samples[0];
  const velocity=(last.y-first.y)/Math.max(1,last.t-first.t);
  const shouldDismiss=!cancelled&&(offset>=Math.min(DISMISS_DISTANCE,sheet.clientHeight*.25)||
   (offset>12&&velocity>=FLICK_VELOCITY));
  if(shouldDismiss){
   dismissing=true;
   const finish=Math.max(offset,sheet.clientHeight+24);
   const remaining=finish-offset;
   const duration=Math.max(130,Math.min(310,remaining/Math.max(.8,velocity)));
   sheet.style.transform='';
   animateTo([{transform:'translateY('+offset+'px)'},{transform:'translateY('+finish+'px)'}],duration,()=>{
    if(!disposed)onDismiss();
   });
  }else reset(offset);
  event.preventDefault();event.stopPropagation();
 }
 const onPointerUp=event=>endDrag(event);
 const onPointerCancel=event=>endDrag(event,true);
 const onTouchMove=event=>{if(event.cancelable)event.preventDefault();event.stopPropagation();};
 handle.addEventListener('pointerdown',onPointerDown);
 handle.addEventListener('pointermove',onPointerMove);
 handle.addEventListener('pointerup',onPointerUp);
 handle.addEventListener('pointercancel',onPointerCancel);
 handle.addEventListener('touchmove',onTouchMove,{passive:false});
 return {destroy(){
  if(disposed)return;
  disposed=true;drag=null;
  cancelAnimation();
  handle.removeEventListener('pointerdown',onPointerDown);
  handle.removeEventListener('pointermove',onPointerMove);
  handle.removeEventListener('pointerup',onPointerUp);
  handle.removeEventListener('pointercancel',onPointerCancel);
  handle.removeEventListener('touchmove',onTouchMove);
 }};
}
