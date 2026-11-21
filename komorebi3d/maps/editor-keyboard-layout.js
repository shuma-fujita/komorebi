// Keep the entire A/B editor viewport pinned while the editor is open.
// On iOS, software-keyboard focus can scroll the underlying document.
// Never unpin the game just because a tag input loses focus: that exposes
// surrounding development panels behind the still-open editor.
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
 if(!game||!vv)return {refresh(){},destroy(){}};
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 const gameStyle={position:game.style.position,top:game.style.top,left:game.style.left,
  width:game.style.width,height:game.style.height,zIndex:game.style.zIndex};
 const hostStyle={position:host.style.position,inset:host.style.inset,width:host.style.width,
  height:host.style.height,maxWidth:host.style.maxWidth,flex:host.style.flex};
 const sheetStyle={position:sheet.style.position,top:sheet.style.top,bottom:sheet.style.bottom,
  height:sheet.style.height,maxHeight:sheet.style.maxHeight};
 const editorOrigin={x:window.scrollX||0,y:window.scrollY};
 let focusOrigin=null,focused=false,pendingBlur=false;
 let frame=0,blurTimer=0,disposed=false,diagnostic=null;

 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 const anchor=()=>({x:window.scrollX||0,y:window.scrollY,h:vv.height,top:vv.offsetTop});
 const viewportRecovered=point=>!point||(
  vv.height>=point.h*.85&&Math.abs(vv.offsetTop-point.top)<=32
 );
 function returnTo(point){
  if(point&&(window.scrollX!==point.x||window.scrollY!==point.y))
   window.scrollTo(point.x,point.y);
 }
 function pinGame(){
  if(!mobile)return;
  const rect=game.getBoundingClientRect();
  // The editor occupies the visible layout viewport, not the original
  // 110svh panel height below the development-information panel.
  Object.assign(game.style,{position:'fixed',top:vv.offsetTop+'px',
   left:rect.left+'px',width:rect.width+'px',height:window.innerHeight+'px',
   zIndex:'1000'});
  Object.assign(host.style,{position:'absolute',inset:'0',width:'100%',
   height:'100%',maxWidth:'none',flex:'none'});
 }
 function normalSheet(){
  Object.assign(sheet.style,sheetStyle);
  const mode=getSheetMode?.();
  sheet.style.height=mode==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheet.style.maxHeight=mode==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
 }
 function unpinGame(){
  if(!mobile)return;
  Object.assign(game.style,gameStyle);
  Object.assign(host.style,hostStyle);
 }
 function finishBlur(){
  if(disposed||focused||!pendingBlur)return;
  pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  normalSheet();
  returnTo(focusOrigin);
  focusOrigin=null;
 }
 function update(){
  frame=0;
  if(disposed||!mask.isConnected||!mobile)return;
  // The visual viewport offset changes during the iOS keyboard animation;
  // the game remains pinned for the *entire* editor session.
  game.style.top=vv.offsetTop+'px';
  if(!focused){
   if(pendingBlur&&viewportRecovered(focusOrigin))finishBlur();
   return;
  }
  if(getSheetMode?.()!=='half'){
   sheet.style.position='relative';
   sheet.style.top='';sheet.style.bottom='';
   sheet.style.height='100%';sheet.style.maxHeight='100%';
   return;
  }
  const gameHeight=game.getBoundingClientRect().height;
  const previewHeight=gameHeight*BUILDING_PREVIEW_RATIO;
  const visible=keyboardSheetHeight(vv.height,previewHeight,gameHeight*BUILDING_SHEET_RATIO);
  sheet.style.position='absolute';
  sheet.style.top=previewHeight+'px';sheet.style.bottom='auto';
  sheet.style.maxHeight=visible+'px';sheet.style.height=visible+'px';
  const input=document.activeElement;
  if(isField(input)&&sheet.contains(input)&&visible>0){
   const bounds=sheet.getBoundingClientRect();
   const row=(input.closest('.komo-tag-row')||input).getBoundingClientRect();
   const delta=focusedTagRowScrollDelta(bounds.top,bounds.bottom,row.top,row.bottom);
   if(Math.abs(delta)>2)sheet.scrollTop+=delta;
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 function onFocusIn(event){
  if(!mobile||!isField(event.target)||!sheet.contains(event.target))return;
  if(!focusOrigin)focusOrigin=anchor(); // before Safari moves the page
  focused=true;pendingBlur=false;
  if(blurTimer){clearTimeout(blurTimer);blurTimer=0;}
  schedule();
 }
 function onFocusOut(){
  if(!mobile)return;
  // iOS sends focusout before focusin when moving between two inputs.
  requestAnimationFrame(()=>{
   if(disposed||!mask.isConnected)return;
   focused=isField(document.activeElement)&&sheet.contains(document.activeElement);
   if(focused){pendingBlur=false;schedule();return;}
   pendingBlur=true;schedule();
   if(blurTimer)clearTimeout(blurTimer);
   blurTimer=setTimeout(()=>{
    blurTimer=0;
    if(pendingBlur&&!focused)finishBlur();
   },1800); // fallback for WebViews that omit the viewport resize
  });
 }
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv.addEventListener('resize',schedule);
 vv.addEventListener('scroll',schedule);
 window.addEventListener('resize',schedule);
 pinGame();
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'){
  import('./editor-keyboard-diagnostics.js?v=trace-20261121').then(mod=>{
   if(disposed||!mask.isConnected)return;
   diagnostic=mod.attachEditorKeyboardDiagnostics({game,host,mask,sheet});
  }).catch(error=>console.warn('editor trace unavailable',error));
 }
 return {refresh:schedule,destroy(){
  if(disposed)return;
  disposed=true;
  diagnostic?.destroy();
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv.removeEventListener('resize',schedule);
  vv.removeEventListener('scroll',schedule);
  window.removeEventListener('resize',schedule);
  if(frame)cancelAnimationFrame(frame);
  if(blurTimer)clearTimeout(blurTimer);
  normalSheet();
  // Closing the editor is the only time the game returns to normal flow.
  // If the keyboard is closing, wait before revealing the underlying page.
  if(mobile&&focusOrigin&&!viewportRecovered(focusOrigin)){
   let timer=0,doneFlag=false;
   function done(){
    if(doneFlag)return;doneFlag=true;
    vv.removeEventListener('resize',check);
    vv.removeEventListener('scroll',check);
    if(timer)clearTimeout(timer);
    returnTo(editorOrigin);
    unpinGame();
   }
   function check(){if(viewportRecovered(focusOrigin))done();}
   vv.addEventListener('resize',check);
   vv.addEventListener('scroll',check);
   timer=setTimeout(done,1800);
  }else{
   returnTo(editorOrigin);
   unpinGame();
  }
 }};
}
