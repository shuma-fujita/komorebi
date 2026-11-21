// The 30% preview and 70% sheet never change size or position for keyboards.
// A trusted touch focuses with preventScroll; once the keyboard opens, only
// reveal the covered part of the focused field INSIDE the sheet, before typing.
// Safari still owns document scroll, and we never counter-scroll while focused.
export function coveredFieldScrollDelta(fieldBottom,visibleBottom,margin=24){
 return Math.max(0,fieldBottom-(visibleBottom-margin));
}
// Extra space is content inside the sheet, not a resize of the sheet itself.
// The full sheet bottom can be below the keyboard; reserve that hidden part
// as scrollable trailing space so even the last tag can rise above it.
export function keyboardTrailingSpace(sheetBottom,visibleBottom,margin=24){
 return Math.max(0,Math.ceil(sheetBottom-visibleBottom+margin));
}
// Translate the existing normal-flow game panel to the top of the visible
// browser viewport by scrolling the DOCUMENT. Never change panel positioning.
// Rect coordinates are layout-viewport-relative; VisualViewport may be offset.
export function gamePanelTopScrollY(scrollY,gameTop,visualOffsetTop=0){
 return Math.max(0,Math.round(scrollY+gameTop-visualOffsetTop));
}
export function attachEditorKeyboardLayout({host,mask,sheet}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 const baselineHeight=vv?.height??window.innerHeight;
 const KEYBOARD_THRESHOLD=110;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 let focusedField=null,focusOrigin=null,keyboardSeen=false,pendingBlur=false;
 let blurFrame=0,revealFrame=0,blurTimer=0,disposed=false,diagnostic=null;
 let trailingSpace=null;
 const keyboardOpen=()=>Boolean(vv)&&vv.height<baselineHeight-KEYBOARD_THRESHOLD;
 const viewportRecovered=()=>!vv||!keyboardOpen();
 function restorePagePosition(point){
  if(point&&(window.scrollX!==point.x||window.scrollY!==point.y))
   window.scrollTo(point.x,point.y);
 }
 function removeTrailingSpace(){
  trailingSpace?.remove();
  trailingSpace=null;
 }
 function syncTrailingSpace(){
  if(!mobile||!keyboardOpen()||!focusedField)return;
  const visibleBottom=vv.offsetTop+vv.height;
  const height=keyboardTrailingSpace(sheet.getBoundingClientRect().bottom,visibleBottom);
  if(height===0){removeTrailingSpace();return;}
  if(!trailingSpace){
   trailingSpace=document.createElement('div');
   trailingSpace.setAttribute('aria-hidden','true');
   trailingSpace.style.cssText='box-sizing:border-box;display:block;width:100%;min-height:0;pointer-events:none;user-select:none;';
   sheet.appendChild(trailingSpace);
  }
  const value=height+'px';
  if(trailingSpace.style.height!==value)trailingSpace.style.height=value;
 }
 function finishBlur(){
  pendingBlur=false;
  removeTrailingSpace();
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  if(keyboardSeen)restorePagePosition(focusOrigin);
  keyboardSeen=false;focusOrigin=null;
 }
 function revealKeyboardCoveredField(){
  revealFrame=0;
  if(disposed||!mask.isConnected||!mobile||!keyboardOpen()||
   !focusedField||document.activeElement!==focusedField||
   !sheet.contains(focusedField))return;
  // First extend the scrollable content; then reveal the covered part.
  // Do not change the panel/sheet geometry or scroll the document.
  syncTrailingSpace();
  // The rect is in layout-viewport coordinates. visualViewport.offsetTop
  // is the origin of the portion actually visible above the keyboard.
  const field=focusedField.getBoundingClientRect();
  const sheetRect=sheet.getBoundingClientRect();
  const visibleBottom=vv.offsetTop+vv.height;
  if(sheetRect.top>=visibleBottom)return;
  const delta=coveredFieldScrollDelta(field.bottom,visibleBottom);
  if(delta<=1)return;
  const maxScroll=Math.max(0,sheet.scrollHeight-sheet.clientHeight);
  const target=Math.min(maxScroll,sheet.scrollTop+delta);
  if(target>sheet.scrollTop+1)sheet.scrollTop=target;
 }
 function scheduleReveal(){
  if(!revealFrame)revealFrame=requestAnimationFrame(revealKeyboardCoveredField);
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
  const newField=focusedField!==event.target;
  focusedField=event.target;pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  if(newField&&game){
   // One intentional document scroll when an input receives focus.
   // Do not chase scrolling from keyboard resize, typing or visualViewport.
   const gameTop=game.getBoundingClientRect().top;
   const destination=gamePanelTopScrollY(window.scrollY,gameTop,vv?.offsetTop??0);
   if(Math.abs(window.scrollY-destination)>1)
    window.scrollTo(window.scrollX||0,destination);
  }
  // Switching to a different field while the keyboard is already open.
  if(mobile&&keyboardOpen())scheduleReveal();
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
  // The trailing space exists only while the software keyboard is visible,
  // even if Safari keeps an input focused when the keyboard is dismissed.
  if(viewportRecovered()){
   removeTrailingSpace();
   if(pendingBlur)finishBlur();
   return;
  }
  // On keyboard resize, reveal only the part hidden below its top edge.
  // No scroll handler, input handler, setInterval or page scroll correction.
  if(focusedField&&mobile&&keyboardOpen()){
   keyboardSeen=true;
   scheduleReveal();
  }
 }
 sheet.addEventListener('pointerdown',onPointerDown,true);
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv?.addEventListener('resize',onViewportResize);
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'&&vv&&game){
  import('./editor-keyboard-diagnostics.js?v=keyboard-covered-field-20261121').then(mod=>{
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
  if(revealFrame)cancelAnimationFrame(revealFrame);
  if(blurTimer)clearTimeout(blurTimer);
  removeTrailingSpace();
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
