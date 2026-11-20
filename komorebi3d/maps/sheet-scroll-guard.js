// Confine touch/wheel scrolling to the OSM editor sheet.
// iOS WebKit may chain scrolling to the surrounding dev/test panels even with
// overscroll-behavior:contain. Avoid locking body positioning so the keyboard
// can still keep focused inputs visible.
export function guardSheetScroll(mask,sheet){
 const touches=new Map();
 const SCROLL_EPSILON=1;
 const belongsToSheet=target=>target===sheet||sheet.contains(target);
 function scrollable(target,deltaY){
  let element=target instanceof Element?target:target?.parentElement;
  while(element&&element!==mask){
   if(element===sheet||sheet.contains(element)){
    const max=Math.max(0,element.scrollHeight-element.clientHeight);
    if(max>SCROLL_EPSILON){
     // Positive delta means finger moved downward: content scrolls upward.
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
  let block=!belongsToSheet(event.target);
  for(const touch of event.changedTouches){
   const previous=touches.get(touch.identifier);
   touches.set(touch.identifier,touch.clientY);
   if(previous===undefined)continue;
   const delta=touch.clientY-previous;
   if(Math.abs(delta)<.1)continue;
   if(!scrollable(event.target,delta))block=true;
  }
  if(block&&event.cancelable)event.preventDefault();
  event.stopPropagation();
 }
 function touchEnd(event){
  for(const touch of event.changedTouches)touches.delete(touch.identifier);
 }
 function wheel(event){
  if(!belongsToSheet(event.target)||!scrollable(event.target,-event.deltaY)){
   if(event.cancelable)event.preventDefault();
  }
  event.stopPropagation();
 }
 // Capture on the overlay, not the document: the game and test panel remain
 // untouched outside editing and form controls keep normal focus behavior.
 mask.addEventListener('touchstart',touchStart,{passive:true,capture:true});
 mask.addEventListener('touchmove',touchMove,{passive:false,capture:true});
 mask.addEventListener('touchend',touchEnd,{passive:true,capture:true});
 mask.addEventListener('touchcancel',touchEnd,{passive:true,capture:true});
 mask.addEventListener('wheel',wheel,{passive:false,capture:true});
 return {destroy(){
  touches.clear();
  mask.removeEventListener('touchstart',touchStart,true);
  mask.removeEventListener('touchmove',touchMove,true);
  mask.removeEventListener('touchend',touchEnd,true);
  mask.removeEventListener('touchcancel',touchEnd,true);
  mask.removeEventListener('wheel',wheel,true);
 }};
}
