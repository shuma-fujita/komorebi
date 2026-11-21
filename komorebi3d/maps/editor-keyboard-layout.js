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

export function attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 if(!game||!vv)return {destroy(){}};
 const surface=host;
 const originals={position:game.style.position,top:game.style.top,left:game.style.left,
  width:game.style.width,height:game.style.height,zIndex:game.style.zIndex,
  sheetPosition:sheet.style.position,sheetTop:sheet.style.top,
  sheetBottom:sheet.style.bottom,sheetHeight:sheet.style.height,
  sheetMaxHeight:sheet.style.maxHeight,previewHeight:previewTouch.style.height,
  surfacePosition:surface.style.position,surfaceInset:surface.style.inset,
  surfaceWidth:surface.style.width,surfaceHeight:surface.style.height,
  surfaceMaxWidth:surface.style.maxWidth,surfaceFlex:surface.style.flex};
 let focused=false,active=false,frame=0,gameHeight=0,previewHeight=0;
 let sheetAtFocus=null;
 let diagnostic=null,disposed=false;
 // Optional device-only trace; the normal game never loads this module.
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'){
  import('./editor-keyboard-diagnostics.js?v=trace-20261121').then(mod=>{
   if(disposed||!mask.isConnected)return;
   diagnostic=mod.attachEditorKeyboardDiagnostics({game,host,mask,sheet});
  }).catch(error=>console.warn('editor trace unavailable',error));
 }
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 function restore(){
  if(!active)return;
  active=false;
  Object.assign(game.style,{position:originals.position,top:originals.top,left:originals.left,
   width:originals.width,height:originals.height,zIndex:originals.zIndex});
  Object.assign(surface.style,{position:originals.surfacePosition,inset:originals.surfaceInset,
   width:originals.surfaceWidth,height:originals.surfaceHeight,
   maxWidth:originals.surfaceMaxWidth,flex:originals.surfaceFlex});
  if(sheetAtFocus)Object.assign(sheet.style,sheetAtFocus);
  sheet.style.height=getSheetMode?.()==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheet.style.maxHeight=getSheetMode?.()==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheetAtFocus=null;
  previewTouch.style.height=originals.previewHeight;
 }
 function update(){
  frame=0;
  if(!focused||!mask.isConnected)return;
  // A hardware keyboard on a desktop must not change the game geometry.
  if(!window.matchMedia?.('(pointer:coarse)')?.matches)return;
  if(!active){
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
 return {refresh:schedule,destroy(){
  disposed=true;
  diagnostic?.destroy();
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv.removeEventListener('resize',schedule);
  vv.removeEventListener('scroll',schedule);
  window.removeEventListener('resize',schedule);
  if(frame)cancelAnimationFrame(frame);
  restore();
 }};
}
