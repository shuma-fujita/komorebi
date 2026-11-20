// Gesture controller for the isolated building editor preview.
// Tap: pause/resume auto-orbit. One finger drag: horizontal orbit. Two fingers: pinch.
// Keep this separate from the helicopter controls and sheet dismissal gesture.
export function attachBuildingPreviewGestures(surface,onChange){
 const pointers=new Map();
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 let yaw=0,zoom=1,pinchDistance=null;
 // Gentle 30-second orbit reveals that this preview can rotate.
 // Manual drag/pinch pauses it; a stationary tap toggles auto-orbit.
 const AUTO_RAD_PER_MS=2*Math.PI/30000;
 let autoFrame=0,autoRunning=false,lastAutoTime=null,disposed=false;
 const TAP_MOVE_LIMIT=9; // CSS px; tolerate a small stationary finger jitter.
 let gestureHadMultiplePointers=false;
 const prefersReducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 function stopAutoRotate(){
  autoRunning=false;lastAutoTime=null;
  if(autoFrame){cancelAnimationFrame(autoFrame);autoFrame=0;}
 }
 function autoTick(time){
  autoFrame=0;
  if(!autoRunning||disposed)return;
  if(document.hidden){lastAutoTime=null;}
  else{
   if(lastAutoTime!==null){
    const elapsed=Math.max(0,Math.min(48,time-lastAutoTime));
    if(elapsed){yaw=(yaw+elapsed*AUTO_RAD_PER_MS)%(2*Math.PI);emit();}
   }
   lastAutoTime=time;
  }
  autoFrame=requestAnimationFrame(autoTick);
 }
 function startAutoRotate(){
  if(disposed||autoRunning||prefersReducedMotion())return;
  autoRunning=true;lastAutoTime=null;
  autoFrame=requestAnimationFrame(autoTick);
 }
 const emit=()=>onChange({yaw,zoom});
 const distance=()=>{
  const [a,b]=[...pointers.values()];
  return Math.hypot(a.x-b.x,a.y-b.y);
 };
 function down(event){
  if(!event.isPrimary&&event.pointerType!=='touch')return;
  if(event.pointerType==='mouse'&&event.button!==0)return;
  if(pointers.has(event.pointerId)||pointers.size>=2)return;
  const wasAutoRunning=autoRunning;
  stopAutoRotate();
  if(pointers.size===0)gestureHadMultiplePointers=false;
  else gestureHadMultiplePointers=true;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,wasAutoRunning});
  try{surface.setPointerCapture(event.pointerId);}catch{}
  if(pointers.size===2)pinchDistance=Math.max(1,distance());
  event.preventDefault();event.stopPropagation();
 }
 function move(event){
  const previous=pointers.get(event.pointerId);
  if(!previous)return;
  const current={x:event.clientX,y:event.clientY};
  const moved=previous.moved||Math.hypot(current.x-previous.startX,current.y-previous.startY)>TAP_MOVE_LIMIT;
  pointers.set(event.pointerId,{...previous,...current,moved});
  if(pointers.size===1){
   // Vertical motion is intentionally ignored; keep pitch/roll fixed.
   const width=Math.max(120,surface.clientWidth);
   if(moved)yaw+=(current.x-previous.x)/width*Math.PI*1.3;
  }else if(pointers.size===2){
   const nextDistance=Math.max(1,distance());
   if(pinchDistance!==null)zoom=clamp(zoom*nextDistance/pinchDistance,.55,3);
   pinchDistance=nextDistance;
  }
  emit();
  event.preventDefault();event.stopPropagation();
 }
 function up(event,cancelled=false){
  if(!pointers.has(event.pointerId))return;
  const pointer=pointers.get(event.pointerId);
  pointers.delete(event.pointerId);
  if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);
  const isTap=!cancelled&&!gestureHadMultiplePointers&&!pointer.moved&&
   Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY)<=TAP_MOVE_LIMIT&&pointers.size===0;
  pinchDistance=null;
  if(isTap&&!pointer.wasAutoRunning)startAutoRotate();
  event.preventDefault();event.stopPropagation();
 }
 // iOS embedded browsers may otherwise interpret a pinch as page zoom.
 const preventTouch=event=>{if(event.cancelable)event.preventDefault();event.stopPropagation();};
 const preventWheel=event=>{
  if(!event.ctrlKey)return;
  stopAutoRotate();
  zoom=clamp(zoom*Math.exp(-event.deltaY*.007),.55,3);emit();
  if(event.cancelable)event.preventDefault();event.stopPropagation();
 };
 surface.addEventListener('pointerdown',down);
 surface.addEventListener('pointermove',move);
 const cancel=event=>up(event,true);
 surface.addEventListener('pointerup',up);
 surface.addEventListener('pointercancel',cancel);
 surface.addEventListener('touchmove',preventTouch,{passive:false});
 surface.addEventListener('wheel',preventWheel,{passive:false});
 return {startAutoRotate,destroy(){
  disposed=true;
  stopAutoRotate();
  pointers.clear();
  for(const [event,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['touchmove',preventTouch],['wheel',preventWheel]])
   surface.removeEventListener(event,handler);
 }};
}
