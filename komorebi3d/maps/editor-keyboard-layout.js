// Keep the A/B building preview visible when iOS scrolls an OSM tag input
// above its software keyboard. Only active while an editor field has focus.
export function keyboardSheetHeight(viewHeight,previewHeight){
 return Math.max(0,Math.min(viewHeight-previewHeight,viewHeight));
}

export function attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 if(!game||!vv)return {destroy(){}};
 const originals={position:game.style.position,top:game.style.top,left:game.style.left,
  width:game.style.width,height:game.style.height,zIndex:game.style.zIndex,
  sheetPosition:sheet.style.position,sheetTop:sheet.style.top,
  sheetBottom:sheet.style.bottom,sheetHeight:sheet.style.height,
  sheetMaxHeight:sheet.style.maxHeight,previewHeight:previewTouch.style.height};
 let focused=false,active=false,frame=0,gameHeight=0,previewHeight=0;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 function restore(){
  if(!active)return;
  active=false;
  Object.assign(game.style,{position:originals.position,top:originals.top,left:originals.left,
   width:originals.width,height:originals.height,zIndex:originals.zIndex});
  Object.assign(sheet.style,{position:originals.sheetPosition,top:originals.sheetTop,
   bottom:originals.sheetBottom,height:originals.sheetHeight,maxHeight:originals.sheetMaxHeight});
  previewTouch.style.height=originals.previewHeight;
 }
 function update(){
  frame=0;
  if(!focused||!mask.isConnected)return;
  // A hardware keyboard on a desktop must not change the game geometry.
  if(!window.matchMedia?.('(pointer:coarse)')?.matches)return;
  if(!active){
   const rect=game.getBoundingClientRect();
   gameHeight=rect.height;
   previewHeight=host.getBoundingClientRect().height*.5;
   game.style.position='fixed';
   game.style.left=rect.left+'px';
   game.style.width=rect.width+'px';
   game.style.height=gameHeight+'px';
   game.style.zIndex='1000';
   active=true;
  }
  // Fixed elements use layout-viewport coordinates; keyboard visibility
  // comes from the visual viewport, whose offset can change on iOS scroll.
  game.style.top=vv.offsetTop+'px';
  if(getSheetMode?.()!=='half')return;
  const visible=keyboardSheetHeight(vv.height,previewHeight);
  sheet.style.position='absolute';
  sheet.style.top=previewHeight+'px';
  sheet.style.bottom='auto';
  sheet.style.maxHeight=visible+'px';
  sheet.style.height=visible+'px';
 }
 function schedule(){
  if(!frame)frame=requestAnimationFrame(update);
 }
 function onFocusIn(event){
  if(!isField(event.target)||!sheet.contains(event.target))return;
  focused=true;
  schedule();
 }
 function onFocusOut(){
  // iOS fires focusout before focusin when switching tag fields.
  requestAnimationFrame(()=>{
   if(!mask.isConnected)return;
   focused=isField(document.activeElement)&&sheet.contains(document.activeElement);
   if(focused)schedule();
   else restore();
  });
 }
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv.addEventListener('resize',schedule);
 vv.addEventListener('scroll',schedule);
 window.addEventListener('resize',schedule);
 return {destroy(){
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv.removeEventListener('resize',schedule);
  vv.removeEventListener('scroll',schedule);
  window.removeEventListener('resize',schedule);
  if(frame)cancelAnimationFrame(frame);
  restore();
 }};
}
