// Route scroll ownership by gesture origin inside the building editor.
// The grip is never a native scroll target; the form's content can scroll.
// Do not stop propagation in capture: the grip's pointer/touch handlers
// must still receive the event before the overlay stops it on bubble.
export function guardSheetScroll(mask,sheet,handle){
 const touches=new Map();
 const SCROLL_EPSILON=1;
 const belongsToSheet=target=>target===sheet||sheet.contains(target);
 const belongsToGrip=target=>Boolean(handle)&&(target===handle||handle.contains(target));
 function scrollable(target,deltaY){
  let element=target instanceof Element?target:target?.parentElement;
  while(element&&element!==mask){
   if(element===sheet||sheet.contains(element)){
    const max=Math.max(0,element.scrollHeight-element.clientHeight);
    if(max>SCROLL_EPSILON){
     if(deltaY>0&&element.scrollTop>SCROLL_EPSILON)return true;
     if(deltaY<0&&element.scrollTop<max-SCROLL_EPSILON)return true;
    }
   }
   if(element===sheet)break;
   element=element.parentElement;
  }
  return false;
 }
 function touchStart(event){
  for(const touch of event.changedTouches)
   touches.set(touch.identifier,touch.clientY);
 }
 function touchMove(event){
  // If the gesture began on the grip, it belongs to sheet-motion,
  // even when the sheet's content happens to be scrollable.
  let block=belongsToGrip(event.target)||!belongsToSheet(event.target);
  for(const touch of event.changedTouches){
   const previous=touches.get(touch.identifier);
   touches.set(touch.identifier,touch.clientY);
   if(previous===undefined)continue;
   const delta=touch.clientY-previous;
   if(Math.abs(delta)<.1)continue;
   if(!belongsToGrip(event.target)&&!scrollable(event.target,delta))block=true;
  }
  if(block&&event.cancelable)event.preventDefault();
 }
 function touchEnd(event){
  for(const touch of event.changedTouches)touches.delete(touch.identifier);
 }
 function wheel(event){
  if(belongsToGrip(event.target)||!belongsToSheet(event.target)||!scrollable(event.target,-event.deltaY)){
   if(event.cancelable)event.preventDefault();
  }
 }
 const stopBubble=event=>event.stopPropagation();
 mask.addEventListener('touchstart',touchStart,{passive:true,capture:true});
 mask.addEventListener('touchmove',touchMove,{passive:false,capture:true});
 mask.addEventListener('touchend',touchEnd,{passive:true,capture:true});
 mask.addEventListener('touchcancel',touchEnd,{passive:true,capture:true});
 mask.addEventListener('wheel',wheel,{passive:false,capture:true});
 mask.addEventListener('touchmove',stopBubble,{passive:false});
 mask.addEventListener('wheel',stopBubble,{passive:false});
 return {destroy(){
  touches.clear();
  mask.removeEventListener('touchstart',touchStart,true);
  mask.removeEventListener('touchmove',touchMove,true);
  mask.removeEventListener('touchend',touchEnd,true);
  mask.removeEventListener('touchcancel',touchEnd,true);
  mask.removeEventListener('wheel',wheel,true);
  mask.removeEventListener('touchmove',stopBubble,false);
  mask.removeEventListener('wheel',stopBubble,false);
 }};
}
