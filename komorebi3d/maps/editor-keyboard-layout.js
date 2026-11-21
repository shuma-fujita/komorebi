// The editor's game panel and 70% sheet never change geometry for keyboards.
// Focus management only scrolls the selected tag within the sheet.
// Safari owns the keyboard and any document scroll needed to reveal it.
export function focusedTagRowScrollDelta(sheetTop,rowTop,gripHeight=36,gap=8){
 return rowTop-(sheetTop+gripHeight+gap);
}

export function attachEditorKeyboardLayout({host,mask,sheet,handle}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 const baselineHeight=vv?.height??window.innerHeight;
 const KEYBOARD_THRESHOLD=110;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 let focusedField=null,focusOrigin=null,keyboardSeen=false,pendingBlur=false;
 let alignFrame=0,blurFrame=0,blurTimer=0,disposed=false,diagnostic=null;
 const keyboardOpen=()=>Boolean(vv)&&vv.height<baselineHeight-KEYBOARD_THRESHOLD;
 const viewportRecovered=()=>!vv||!keyboardOpen();
 function restorePagePosition(point){
  if(point&&(window.scrollX!==point.x||window.scrollY!==point.y))
   window.scrollTo(point.x,point.y);
 }
 function alignFocusedRow(){
  alignFrame=0;
  if(disposed||!mask.isConnected||!focusedField||
    document.activeElement!==focusedField||!sheet.contains(focusedField))return;
  const bounds=sheet.getBoundingClientRect();
  const row=(focusedField.closest('.komo-tag-row')||focusedField).getBoundingClientRect();
  const gripHeight=handle?.getBoundingClientRect?.().height||36;
  const delta=focusedTagRowScrollDelta(bounds.top,row.top,gripHeight);
  if(Math.abs(delta)>2)sheet.scrollTop+=delta;
 }
 function scheduleAlign(){
  if(!alignFrame)alignFrame=requestAnimationFrame(alignFocusedRow);
 }
 function finishBlur(){
  pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  if(keyboardSeen)restorePagePosition(focusOrigin);
  keyboardSeen=false;focusOrigin=null;
 }
 function onFocusIn(event){
  if(!isField(event.target)||!sheet.contains(event.target))return;
  if(!focusOrigin)focusOrigin={x:window.scrollX||0,y:window.scrollY};
  focusedField=event.target;pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  scheduleAlign();
 }
 function onFocusOut(){
  if(blurFrame)cancelAnimationFrame(blurFrame);
  // Moving between two tag fields sends focusout before focusin.
  blurFrame=requestAnimationFrame(()=>{
   blurFrame=0;
   if(disposed||!mask.isConnected)return;
   const next=document.activeElement;
   if(isField(next)&&sheet.contains(next)){
    focusedField=next;pendingBlur=false;scheduleAlign();return;
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
  // This event never sets the sheet size, game position or camera framing.
  if(focusedField){
   if(mobile&&keyboardOpen())keyboardSeen=true;
   scheduleAlign();
  }else if(pendingBlur&&viewportRecovered()){
   finishBlur();
  }
 }
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv?.addEventListener('resize',onViewportResize);
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'&&vv&&game){
  import('./editor-keyboard-diagnostics.js?v=trace-20261121').then(mod=>{
   if(disposed||!mask.isConnected)return;
   diagnostic=mod.attachEditorKeyboardDiagnostics({game,host,mask,sheet});
  }).catch(error=>console.warn('editor trace unavailable',error));
 }
 return {refresh:scheduleAlign,destroy(){
  if(disposed)return;
  disposed=true;diagnostic?.destroy();
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv?.removeEventListener('resize',onViewportResize);
  if(alignFrame)cancelAnimationFrame(alignFrame);
  if(blurFrame)cancelAnimationFrame(blurFrame);
  if(blurTimer)clearTimeout(blurTimer);
  if(!keyboardSeen||!focusOrigin)return;
  if(viewportRecovered()){restorePagePosition(focusOrigin);return;}
  // An editor may close while the iOS keyboard is still dismissing.
  // Restore the *document* once afterward; never pin the game panel.
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
