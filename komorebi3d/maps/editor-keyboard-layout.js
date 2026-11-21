// Observe the iOS visual viewport for an editor hosted in a normal-flow game.
// This module NEVER changes the game/surface positioning or sheet CSS:
// sheet-motion.js alone owns the bottom sheet geometry.
export function keyboardSheetHeight(viewHeight,previewHeight,normalSheetHeight,gameTop=0){
 return Math.max(0,Math.min(normalSheetHeight,viewHeight-Math.max(0,gameTop)-previewHeight));
}
export function focusedTagRowScrollDelta(sheetTop,sheetBottom,rowTop,rowBottom){
 const grip=Math.min(36,Math.max(0,sheetBottom-sheetTop)/3);
 return (rowTop+rowBottom)/2-(sheetTop+grip+sheetBottom)/2;
}
export function attachEditorKeyboardLayout({host,mask,sheet,onViewportChange}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 if(!game||!vv)return {refresh(){},destroy(){}};
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 const initialVisualHeight=vv.height;
 const KEYBOARD_THRESHOLD=110;
 let focused=false,pendingBlur=false,keyboardSeen=false,focusOrigin=null;
 let frame=0,blurTimer=0,disposed=false,diagnostic=null;
 const viewportRecovered=()=>vv.height>=initialVisualHeight-KEYBOARD_THRESHOLD;
 function restorePagePosition(point){
  if(point&&(window.scrollX!==point.x||window.scrollY!==point.y))
   window.scrollTo(point.x,point.y);
 }
 function updateFocusedRow(){
  const input=document.activeElement;
  if(!isField(input)||!sheet.contains(input))return;
  const bounds=sheet.getBoundingClientRect();
  if(bounds.height<=0)return;
  const row=(input.closest('.komo-tag-row')||input).getBoundingClientRect();
  const delta=focusedTagRowScrollDelta(bounds.top,bounds.bottom,row.top,row.bottom);
  if(Math.abs(delta)>2)sheet.scrollTop+=delta;
 }
 function finishBlur(){
  pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  onViewportChange?.(null,0);
  if(keyboardSeen)restorePagePosition(focusOrigin);
  keyboardSeen=false;focusOrigin=null;
 }
 function update(){
  frame=0;
  if(disposed||!mask.isConnected||!mobile)return;
  const showing=vv.height<initialVisualHeight-KEYBOARD_THRESHOLD;
  if(!focused){
   if(pendingBlur&&(!showing||!keyboardSeen))finishBlur();
   return;
  }
  if(!showing){
   onViewportChange?.(null,0);
   return;
  }
  keyboardSeen=true;
  // Page scrolling is allowed: retain the original panel DOM/layout and
  // bring its top into view instead of changing the game's CSS position.
  const rect=game.getBoundingClientRect();
  // Element bounds are in layout-viewport coordinates. The keyboard can pan
  // the *visual* viewport within it, so subtract visualViewport.offsetTop
  // before testing visibility or choosing the normal document scroll target.
  const topInVisibleViewport=rect.top-vv.offsetTop;
  onViewportChange?.(vv.height,topInVisibleViewport);
  if(Math.abs(topInVisibleViewport)>3){
   // Scroll the document, never move the game's element out of its panel.
   // The visible document top is scrollY + visualViewport.offsetTop.
   window.scrollTo(window.scrollX||0,
    Math.max(0,window.scrollY+topInVisibleViewport));
  }
  updateFocusedRow();
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 function onFocusIn(event){
  if(!mobile||!isField(event.target)||!sheet.contains(event.target))return;
  if(!focusOrigin)focusOrigin={x:window.scrollX||0,y:window.scrollY};
  focused=true;pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  schedule();
 }
 function onFocusOut(){
  if(!mobile)return;
  // On iOS focusout precedes focusin when changing between tag fields.
  requestAnimationFrame(()=>{
   if(disposed||!mask.isConnected)return;
   focused=isField(document.activeElement)&&sheet.contains(document.activeElement);
   if(focused){pendingBlur=false;schedule();return;}
   pendingBlur=true;schedule();
   if(blurTimer)clearTimeout(blurTimer);
   blurTimer=setTimeout(()=>{
    blurTimer=0;
    if(pendingBlur&&!focused)finishBlur();
   },1800);
  });
 }
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv.addEventListener('resize',schedule);
 vv.addEventListener('scroll',schedule);
 window.addEventListener('resize',schedule);
 window.addEventListener('scroll',schedule,{passive:true});
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'){
  import('./editor-keyboard-diagnostics.js?v=trace-20261121').then(mod=>{
   if(disposed||!mask.isConnected)return;
   diagnostic=mod.attachEditorKeyboardDiagnostics({game,host,mask,sheet});
  }).catch(error=>console.warn('editor trace unavailable',error));
 }
 return {refresh:schedule,destroy(){
  if(disposed)return;
  disposed=true;diagnostic?.destroy();
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv.removeEventListener('resize',schedule);
  vv.removeEventListener('scroll',schedule);
  window.removeEventListener('resize',schedule);
  window.removeEventListener('scroll',schedule);
  if(frame)cancelAnimationFrame(frame);
  if(blurTimer)clearTimeout(blurTimer);
  if(!keyboardSeen)return;
  if(viewportRecovered()){restorePagePosition(focusOrigin);return;}
  // The sheet may be closed while the software keyboard is still animating.
  // Wait only for the page scroll to be restorable; never pin the game.
  const point=focusOrigin;
  let timer=0,doneFlag=false;
  function done(){
   if(doneFlag)return;doneFlag=true;
   vv.removeEventListener('resize',check);
   vv.removeEventListener('scroll',check);
   if(timer)clearTimeout(timer);
   restorePagePosition(point);
  }
  function check(){if(viewportRecovered())done();}
  vv.addEventListener('resize',check);
  vv.addEventListener('scroll',check);
  timer=setTimeout(done,1800);
 }};
}
