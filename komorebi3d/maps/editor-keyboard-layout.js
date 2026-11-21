// Investigation baseline: keep the 30% preview and 70% form untouched.
// Do not scroll tag rows or the page while an input has focus.
// A trusted touch can focus a field synchronously with preventScroll;
// Safari may still pan its visual viewport when the keyboard opens.
export function attachEditorKeyboardLayout({host,mask,sheet}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 const baselineHeight=vv?.height??window.innerHeight;
 const KEYBOARD_THRESHOLD=110;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 let focusedField=null,focusOrigin=null,keyboardSeen=false,pendingBlur=false;
 let blurFrame=0,blurTimer=0,disposed=false,diagnostic=null;
 const keyboardOpen=()=>Boolean(vv)&&vv.height<baselineHeight-KEYBOARD_THRESHOLD;
 const viewportRecovered=()=>!vv||!keyboardOpen();
 function restorePagePosition(point){
  if(point&&(window.scrollX!==point.x||window.scrollY!==point.y))
   window.scrollTo(point.x,point.y);
 }
 function finishBlur(){
  pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  if(keyboardSeen)restorePagePosition(focusOrigin);
  keyboardSeen=false;focusOrigin=null;
 }
 function onPointerDown(event){
  // Safari normally focuses a tapped input as its default action, which
  // may also scroll it. Focusing ahead of that action with preventScroll
  // suppresses the focus-triggered scroll where WebKit supports it.
  // Do NOT preventDefault: iOS still needs the native tap to open the
  // keyboard and position the caret.
  const target=event.target;
  if(!mobile||event.pointerType!=='touch'||!isField(target)||
   !sheet.contains(target)||target.disabled||document.activeElement===target)return;
  if(!focusOrigin)focusOrigin={x:window.scrollX||0,y:window.scrollY};
  target.focus({preventScroll:true});
 }
 function onFocusIn(event){
  if(!isField(event.target)||!sheet.contains(event.target))return;
  if(!focusOrigin)focusOrigin={x:window.scrollX||0,y:window.scrollY};
  focusedField=event.target;pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
 }
 function onFocusOut(){
  if(blurFrame)cancelAnimationFrame(blurFrame);
  // A change of input fires focusout before the next focusin.
  blurFrame=requestAnimationFrame(()=>{
   blurFrame=0;
   if(disposed||!mask.isConnected)return;
   const next=document.activeElement;
   if(isField(next)&&sheet.contains(next)){
    focusedField=next;pendingBlur=false;return;
   }
   focusedField=null;pendingBlur=true;
   if(viewportRecovered()||!keyboardSeen){finishBlur();return;}
   if(blurTimer)clearTimeout(blurTimer);
   blurTimer=setTimeout(()=>{
    blurTimer=0;
    if(pendingBlur&&!focusedField)finishBlur();
   },1800);
  });
 }
 function onViewportResize(){
  // Observe only: no sheet/game CSS, tag scrollTop or page scrollTo.
  if(focusedField&&mobile&&keyboardOpen())keyboardSeen=true;
  else if(pendingBlur&&viewportRecovered())finishBlur();
 }
 sheet.addEventListener('pointerdown',onPointerDown,true);
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv?.addEventListener('resize',onViewportResize);
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'&&vv&&game){
  import('./editor-keyboard-diagnostics.js?v=trace-20261121').then(mod=>{
   if(disposed||!mask.isConnected)return;
   diagnostic=mod.attachEditorKeyboardDiagnostics({game,host,mask,sheet});
  }).catch(error=>console.warn('editor trace unavailable',error));
 }
 return {destroy(){
  if(disposed)return;
  disposed=true;diagnostic?.destroy();
  sheet.removeEventListener('pointerdown',onPointerDown,true);
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv?.removeEventListener('resize',onViewportResize);
  if(blurFrame)cancelAnimationFrame(blurFrame);
  if(blurTimer)clearTimeout(blurTimer);
  if(!keyboardSeen||!focusOrigin)return;
  if(viewportRecovered()){restorePagePosition(focusOrigin);return;}
  // Once the keyboard has fully closed, restore the page just once.
  // Do not fight keyboard-opening scroll or visualViewport movement.
  const point=focusOrigin;
  let timer=0,doneFlag=false;
  function done(){
   if(doneFlag)return;
   doneFlag=true;
   vv.removeEventListener('resize',check);
   if(timer)clearTimeout(timer);
   restorePagePosition(point);
  }
  function check(){if(viewportRecovered())done();}
  vv.addEventListener('resize',check);
  timer=setTimeout(done,1800);
 }};
}
