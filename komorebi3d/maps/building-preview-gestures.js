// Gesture controller for the isolated building editor preview.
// One finger: horizontal orbit only. Two fingers: pinch to zoom.
// Keep this separate from the helicopter controls and sheet dismissal gesture.
export function attachBuildingPreviewGestures(surface,onChange){
 const pointers=new Map();
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 let yaw=0,zoom=1,pinchDistance=null;
 // Gentle 30-second orbit reveals that this preview can rotate.
 // Manual interaction stops it for the remainder of this editor session.
 const AUTO_RAD_PER_MS=2*Math.PI/30000;
 let autoFrame=0,autoRunning=false,lastAutoTime=null,disposed=false;
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
  stopAutoRotate();
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  try{surface.setPointerCapture(event.pointerId);}catch{}
  if(pointers.size===2)pinchDistance=Math.max(1,distance());
  event.preventDefault();event.stopPropagation();
 }
 function move(event){
  const previous=pointers.get(event.pointerId);
  if(!previous)return;
  const current={x:event.clientX,y:event.clientY};
  pointers.set(event.pointerId,current);
  if(pointers.size===1){
   // Vertical motion is intentionally ignored; keep pitch/roll fixed.
   const width=Math.max(120,surface.clientWidth);
   yaw+=(current.x-previous.x)/width*Math.PI*1.3;
  }else if(pointers.size===2){
   const nextDistance=Math.max(1,distance());
   if(pinchDistance!==null)zoom=clamp(zoom*nextDistance/pinchDistance,.55,3);
   pinchDistance=nextDistance;
  }
  emit();
  event.preventDefault();event.stopPropagation();
 }
 function up(event){
  if(!pointers.has(event.pointerId))return;
  pointers.delete(event.pointerId);
  if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);
  pinchDistance=null;
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
 surface.addEventListener('pointerup',up);
 surface.addEventListener('pointercancel',up);
 surface.addEventListener('touchmove',preventTouch,{passive:false});
 surface.addEventListener('wheel',preventWheel,{passive:false});
 return {startAutoRotate,destroy(){
  disposed=true;
  stopAutoRotate();
  pointers.clear();
  for(const [event,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['touchmove',preventTouch],['wheel',preventWheel]])
   surface.removeEventListener(event,handler);
 }};
}
