// The editor lives inside the normal-flow game panel.
// Safari owns document scrolling while an input has focus. The former
// feedback loop (scrollTo on every scroll/visualViewport event) is forbidden.
// This observer reports viewport geometry to sheet-motion and reveals the
// selected field once after the keyboard viewport has settled.
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
 const KEYBOARD_THRESHOLD=110,KEYBOARD_SETTLE_MS=90;
 let focused=false,pendingBlur=false,keyboardSeen=false,focusOrigin=null;
 let frame=0,blurTimer=0,revealTimer=0,disposed=false,diagnostic=null;
 let revealField=null;
 const viewportRecovered=()=>vv.height>=initialVisualHeight-KEYBOARD_THRESHOLD;
 function restorePagePosition(point){
  if(point&&(window.scrollX!==point.x||window.scrollY!==point.y))
   window.scrollTo(point.x,point.y);
 }
 function scheduleReveal(){
  if(revealTimer)clearTimeout(revealTimer);
  revealTimer=setTimeout(()=>{
   revealTimer=0;
   if(disposed||!focused||!keyboardSeen||!mask.isConnected)return;
   const input=document.activeElement;
   if(!isField(input)||!sheet.contains(input))return;
   // Center within the sheet, and ask the browser once to reveal this
   // field in its *visual* viewport. Never fight its subsequent scrolling.
   const bounds=sheet.getBoundingClientRect();
   if(bounds.height>0){
    const row=(input.closest('.komo-tag-row')||input).getBoundingClientRect();
    const delta=focusedTagRowScrollDelta(bounds.top,bounds.bottom,row.top,row.bottom);
    if(Math.abs(delta)>2)sheet.scrollTop+=delta;
   }
   if(revealField!==input){
    revealField=input;
    input.scrollIntoView?.({block:'center',inline:'nearest',behavior:'instant'});
   }
  },KEYBOARD_SETTLE_MS);
 }
 function finishBlur(){
  pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  if(revealTimer){clearTimeout(revealTimer);revealTimer=0;}
  onViewportChange?.(null,0);
  if(keyboardSeen)restorePagePosition(focusOrigin);
  keyboardSeen=false;focusOrigin=null;revealField=null;
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
  const rect=game.getBoundingClientRect();
  const topInVisibleViewport=rect.top-vv.offsetTop;
  onViewportChange?.(vv.height,topInVisibleViewport);
  // No scrollTo here. It triggered a 52 <-> 380 px feedback loop when
  // Safari changed visualViewport.offsetTop after a page scroll.
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 function onFocusIn(event){
  if(!mobile||!isField(event.target)||!sheet.contains(event.target))return;
  if(!focusOrigin)focusOrigin={x:window.scrollX||0,y:window.scrollY};
  focused=true;pendingBlur=false;revealField=null;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  schedule();
 }
 function onFocusOut(){
  if(!mobile)return;
  requestAnimationFrame(()=>{
   if(disposed||!mask.isConnected)return;
   focused=isField(document.activeElement)&&sheet.contains(document.activeElement);
   if(focused){pendingBlur=false;schedule();return;}
   pendingBlur=true;schedule();
   if(revealTimer){clearTimeout(revealTimer);revealTimer=0;}
   if(blurTimer)clearTimeout(blurTimer);
   blurTimer=setTimeout(()=>{
    blurTimer=0;
    if(pendingBlur&&!focused)finishBlur();
   },1800);
  });
 }
 function onVVResize(){
  schedule();
  if(focused&&vv.height<initialVisualHeight-KEYBOARD_THRESHOLD)scheduleReveal();
 }
 function onVVScroll(){schedule();}
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv.addEventListener('resize',onVVResize);
 vv.addEventListener('scroll',onVVScroll);
 window.addEventListener('resize',onVVResize);
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
  vv.removeEventListener('resize',onVVResize);
  vv.removeEventListener('scroll',onVVScroll);
  window.removeEventListener('resize',onVVResize);
  window.removeEventListener('scroll',schedule);
  if(frame)cancelAnimationFrame(frame);
  if(blurTimer)clearTimeout(blurTimer);
  if(revealTimer)clearTimeout(revealTimer);
  if(!keyboardSeen)return;
  if(viewportRecovered()){restorePagePosition(focusOrigin);return;}
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
