// Three-stop native-feeling OSM bottom sheet: half, full, dismiss.
// Only the grip owns vertical gestures. The form keeps native scrolling.
export function attachSheetMotion(sheet,handle,onDismiss,onModeChange=null){
 const SAMPLE_WINDOW=110,DISMISS_DISTANCE=90,FLICK_VELOCITY=.55;
 const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 let mode='half',drag=null,animation=null,disposed=false,dismissing=false;
 function height(){return Math.max(1,sheet.parentElement?.getBoundingClientRect().height||sheet.clientHeight*2||1);}
 function half(){return height()*.6;}
 function stopAnimation(){
  if(animation){animation.cancel();animation=null;}
 }
 function setSize(visibleHeight,below=0){
  sheet.style.maxHeight='100%';
  sheet.style.height=Math.max(1,visibleHeight)+'px';
  sheet.style.transform=below>0?'translateY('+below+'px)':'';
 }
 function settle(target,fromHeight,fromOffset=0,velocity=0){
  stopAnimation();
  const screenHeight=height(),mid=screenHeight*.6;
  const toHeight=target==='full'?screenHeight:mid;
  const toOffset=target==='dismiss'?Math.max(mid+24,fromOffset+mid):0;
  const duration=target==='dismiss'
   ?Math.max(140,Math.min(300,screenHeight/Math.max(1,Math.abs(velocity)*2)))
   :250;
  // Final dimensions are applied only after the visual transition finishes.
  // This prevents snapping a full-screen sheet back to half before the fade.
  if(reducedMotion()||typeof sheet.animate!=='function'){
   if(target==='dismiss'){if(!disposed)onDismiss();return;}
   setSize(toHeight);mode=target;onModeChange?.(mode);return;
  }
  setSize(fromHeight,fromOffset);
  const frames=target==='dismiss'
   ?[{height:fromHeight+'px',transform:'translateY('+fromOffset+'px)'},{height:mid+'px',transform:'translateY('+toOffset+'px)'}]
   :[{height:fromHeight+'px',transform:'translateY('+fromOffset+'px)'},{height:toHeight+'px',transform:'translateY(0px)'}];
  const current=sheet.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  animation=current;
  current.finished.then(()=>{
   if(disposed||animation!==current)return;
   animation=null;
   current.cancel();
   if(target==='dismiss'){onDismiss();return;}
   setSize(toHeight);mode=target;onModeChange?.(mode);
  },()=>{});
 }
 function onPointerDown(event){
  if(disposed||dismissing||drag||!event.isPrimary||event.button!==0)return;
  // Interruption starts from the actual settled size.
  if(animation){
   const visual=sheet.getBoundingClientRect();
   stopAnimation();
   const parent=sheet.parentElement.getBoundingClientRect();
   const top=Math.max(0,visual.top-parent.top);
   mode=top<parent.height*.25?'full':'half';
   setSize(mode==='full'?parent.height:parent.height*.6);
  }
  const screenHeight=height(),baseTop=mode==='full'?0:screenHeight*.4;
  drag={id:event.pointerId,startY:event.clientY,baseTop,top:baseTop,screenHeight,
   samples:[{y:event.clientY,t:performance.now()}]};
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();event.stopPropagation();
 }
 function onPointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const now=performance.now(),mid=drag.screenHeight*.4;
  // Full -> half -> past half into dismissal can happen in one continuous drag.
  drag.top=Math.max(0,Math.min(drag.screenHeight+.2*mid,drag.baseTop+event.clientY-drag.startY));
  const visibleHeight=drag.screenHeight-Math.min(drag.top,mid);
  setSize(visibleHeight,Math.max(0,drag.top-mid));
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
  const mid=state.screenHeight*.4,top=state.top;
  const displacement=top-state.baseTop;
  const visibleHeight=state.screenHeight-Math.min(top,mid);
  const below=Math.max(0,top-mid);
  let target=mode;
  if(!cancelled){
   if(top>=mid+DISMISS_DISTANCE||(
    mode==='half'&&displacement>12&&velocity>=FLICK_VELOCITY))target='dismiss';
   else if(mode==='half'&&(displacement< -56||(displacement< -12&&velocity<=-FLICK_VELOCITY)))target='full';
   else if(mode==='full'&&(displacement>65||(displacement>12&&velocity>=FLICK_VELOCITY)))target='half';
  }
  if(target==='dismiss')dismissing=true;
  settle(target,visibleHeight,below,velocity);
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
 return {
  toggle(){if(disposed||dismissing||drag)return;settle(mode==='full'?'half':'full',sheet.getBoundingClientRect().height);},
  getMode(){return mode;},
  destroy(){
   if(disposed)return;
   disposed=true;drag=null;
   stopAnimation();
   handle.removeEventListener('pointerdown',onPointerDown);
   handle.removeEventListener('pointermove',onPointerMove);
   handle.removeEventListener('pointerup',onPointerUp);
   handle.removeEventListener('pointercancel',onPointerCancel);
   handle.removeEventListener('touchmove',onTouchMove);
  }
 };
}
