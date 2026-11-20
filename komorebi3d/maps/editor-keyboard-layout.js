// Keep the A/B building preview visible when iOS scrolls an OSM tag input
// above its software keyboard. Only active while an editor field has focus.
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from './building-editor-layout.js?v=ratio-centered-20261121';
export function keyboardSheetHeight(viewHeight,previewHeight,normalSheetHeight){
 return Math.max(0,Math.min(normalSheetHeight,viewHeight-previewHeight));
}

export function focusedTagRowScrollDelta(sheetTop,sheetBottom,rowTop,rowBottom){
 const grip=Math.min(36,Math.max(0,sheetBottom-sheetTop)/3);
 return (rowTop+rowBottom)/2-(sheetTop+grip+sheetBottom)/2;
}

// CSS-relative offset: keep the same viewport top without scrolling the page.
export function relativeEditorTop(currentOffset,targetTop,currentViewportTop){
 return currentOffset+targetTop-currentViewportTop;
}

export function attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 if(!game||!vv)return {destroy(){}};
 const surface=host;
 const gameSlot=game.closest('.panel-slot-main');
 const slotOverflow=gameSlot?.style.overflow??'';
 const originals={position:game.style.position,top:game.style.top,left:game.style.left,
  width:game.style.width,height:game.style.height,zIndex:game.style.zIndex,
  sheetPosition:sheet.style.position,sheetTop:sheet.style.top,
  sheetBottom:sheet.style.bottom,sheetHeight:sheet.style.height,
  sheetMaxHeight:sheet.style.maxHeight,previewHeight:previewTouch.style.height,
  surfacePosition:surface.style.position,surfaceInset:surface.style.inset,
  surfaceWidth:surface.style.width,surfaceHeight:surface.style.height,
  surfaceMaxWidth:surface.style.maxWidth,surfaceFlex:surface.style.flex};
 let focused=false,active=false,frame=0,anchorFrame=0,gameHeight=0,previewHeight=0,retainedHeight=false;
 let anchorTop=0,anchorScroll=0,anchorUntil=0;
 let sheetAtFocus=null;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 // Relative positioning keeps the editor visually in place after
 // releasing fixed positioning, even if Safari reverses the page scroll.
 function reanchor(){
  if(!retainedHeight||!mask.isConnected)return;
  const rect=game.getBoundingClientRect();
  const offset=anchorTop-rect.top;
  if(Math.abs(offset)>.5)game.style.top=relativeEditorTop(parseFloat(game.style.top)||0,anchorTop,rect.top)+'px';
  sheet.scrollTop=anchorScroll;
 }
 function restore(preserveViewport=true){
  if(anchorFrame){cancelAnimationFrame(anchorFrame);anchorFrame=0;}
  if(!active){
   if(!preserveViewport&&retainedHeight){
    retainedHeight=false;
    anchorUntil=0;
    game.style.position=originals.position;
    game.style.top=originals.top;
    game.style.height=originals.height;
    if(gameSlot)gameSlot.style.overflow=slotOverflow;
   }
   return;
  }
  active=false;
  anchorTop=game.getBoundingClientRect().top;
  anchorScroll=sheet.scrollTop;
  retainedHeight=preserveViewport;
  if(gameSlot)gameSlot.style.overflow=preserveViewport?'visible':slotOverflow;
  anchorUntil=preserveViewport?performance.now()+700:0;
  Object.assign(game.style,{position:preserveViewport?'relative':originals.position,
   top:preserveViewport?'0px':originals.top,left:originals.left,
   width:originals.width,height:preserveViewport?gameHeight+'px':originals.height,
   zIndex:originals.zIndex});
  Object.assign(surface.style,{position:originals.surfacePosition,inset:originals.surfaceInset,
   width:originals.surfaceWidth,height:originals.surfaceHeight,
   maxWidth:originals.surfaceMaxWidth,flex:originals.surfaceFlex});
  if(sheetAtFocus)Object.assign(sheet.style,sheetAtFocus);
  sheet.style.height=getSheetMode?.()==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheet.style.maxHeight=getSheetMode?.()==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheetAtFocus=null;
  previewTouch.style.height=originals.previewHeight;
  if(preserveViewport){
   reanchor();
   anchorFrame=requestAnimationFrame(()=>{
    anchorFrame=0;
    reanchor();
   });
  }
 }
 function onViewportChange(){
  if(!active&&retainedHeight&&performance.now()<anchorUntil){
   if(!anchorFrame)anchorFrame=requestAnimationFrame(()=>{
    anchorFrame=0;
    reanchor();
   });
  }else schedule();
 }
 function update(){
  frame=0;
  if(!focused||!mask.isConnected)return;
  // A hardware keyboard on a desktop must not change the game geometry.
  if(!window.matchMedia?.('(pointer:coarse)')?.matches)return;
  if(!active){
   if(gameSlot)gameSlot.style.overflow=slotOverflow;
   sheetAtFocus={position:sheet.style.position,top:sheet.style.top,
    bottom:sheet.style.bottom,height:sheet.style.height,maxHeight:sheet.style.maxHeight};
   const rect=game.getBoundingClientRect();
   gameHeight=rect.height;
   previewHeight=host.getBoundingClientRect().height*BUILDING_PREVIEW_RATIO;
   game.style.position='fixed';
   game.style.left=rect.left+'px';
   game.style.width=rect.width+'px';
   game.style.height=gameHeight+'px';
   game.style.zIndex='1000';
   // A flex child can be vertically centered when Safari resizes the visual
   // viewport mid-keyboard animation, leaving a gap above both canvases.
   // Pin the WebGL surface to the game frame's top edge while editing.
   surface.style.position='absolute';
   surface.style.inset='0';
   surface.style.width='100%';
   surface.style.height='100%';
   surface.style.maxWidth='none';
   surface.style.flex='none';
   active=true;
  }
  // Fixed elements use layout-viewport coordinates; keyboard visibility
  // comes from the visual viewport, whose offset can change on iOS scroll.
  game.style.top=vv.offsetTop+'px';
  if(getSheetMode?.()!=='half'){
   sheet.style.position='relative';
   sheet.style.top='';
   sheet.style.bottom='';
   sheet.style.maxHeight='100%';
   return;
  }
  const visible=keyboardSheetHeight(vv.height,previewHeight,gameHeight*BUILDING_SHEET_RATIO);
  sheet.style.position='absolute';
  sheet.style.top=previewHeight+'px';
  sheet.style.bottom='auto';
  sheet.style.maxHeight=visible+'px';
  sheet.style.height=visible+'px';
  // Center the focused tag ROW in the visible strip above the keyboard,
  // below the 36px sticky grip; scrolling belongs to the sheet only.
  const input=document.activeElement;
  if(isField(input)&&sheet.contains(input)&&visible>0){
   const bounds=sheet.getBoundingClientRect();
   const row=(input.closest('.komo-tag-row')||input).getBoundingClientRect();
   const delta=focusedTagRowScrollDelta(bounds.top,bounds.bottom,row.top,row.bottom);
   if(Math.abs(delta)>2)sheet.scrollTop+=delta;
  }
 }
 function schedule(){
  if(!frame)frame=requestAnimationFrame(update);
 }
 function onFocusIn(event){
  if(!isField(event.target)||!sheet.contains(event.target))return;
  focused=true;
  if(anchorFrame){cancelAnimationFrame(anchorFrame);anchorFrame=0;}
  anchorUntil=0;
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
 vv.addEventListener('resize',onViewportChange);
 vv.addEventListener('scroll',onViewportChange);
 window.addEventListener('resize',onViewportChange);
 window.addEventListener('scroll',onViewportChange,{passive:true});
 return {refresh:schedule,destroy(){
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv.removeEventListener('resize',onViewportChange);
  vv.removeEventListener('scroll',onViewportChange);
  window.removeEventListener('resize',onViewportChange);
  window.removeEventListener('scroll',onViewportChange);
  if(frame)cancelAnimationFrame(frame);
  if(anchorFrame)cancelAnimationFrame(anchorFrame);
  restore(false);
 }};
}
