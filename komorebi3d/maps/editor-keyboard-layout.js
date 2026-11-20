// iOS OSM editor: keep the game in its panel's normal layout.
// The editing sheet owns keyboard sizing/scroll; the background page is
// scroll-locked only while its modal editor exists.
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from './building-editor-layout.js?v=ratio-centered-20261121';

export function keyboardSheetHeight(viewHeight,previewHeight,normalSheetHeight,gameTop=0){
 return Math.max(0,Math.min(normalSheetHeight,viewHeight-gameTop-previewHeight));
}
export function focusedTagRowScrollDelta(sheetTop,sheetBottom,rowTop,rowBottom){
 const grip=Math.min(36,Math.max(0,sheetBottom-sheetTop)/3);
 return (rowTop+rowBottom)/2-(sheetTop+grip+sheetBottom)/2;
}

// A single page lock is shared even if A/B editors briefly overlap.
const pageLocks=new WeakMap();
function lockBackgroundPage(doc,vv){
 let lock=pageLocks.get(doc);
 if(lock){lock.count++;return lock;}
 const body=doc.body;
 const scrollX=window.scrollX,scrollY=window.scrollY;
 const initialViewportTop=vv.offsetTop;
 const saved=Object.fromEntries(
  ['position','top','left','right','width','overflow','overscrollBehavior']
   .map(key=>[key,body.style[key]])
 );
 lock={count:1};
 lock.sync=()=>{
  // A visual viewport pan changes the on-screen position, not document flow.
  // Counteract only that pan; all game and panel CSS stays untouched.
  body.style.top=(-scrollY+(vv.offsetTop-initialViewportTop))+'px';
 };
 lock.release=()=>{
  if(--lock.count>0)return;
  pageLocks.delete(doc);
  Object.assign(body.style,saved);
  window.scrollTo(scrollX,scrollY);
 };
 pageLocks.set(doc,lock);
 Object.assign(body.style,{position:'fixed',left:'0',right:'0',width:'100%',
  overflow:'hidden',overscrollBehavior:'none'});
 lock.sync();
 return lock;
}

export function attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 if(!game||!vv)return {refresh(){},destroy(){}};
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 if(!mobile)return {refresh(){},destroy(){}};
 const pageLock=lockBackgroundPage(document,vv);
 const originalSheet={position:sheet.style.position,top:sheet.style.top,
  bottom:sheet.style.bottom,height:sheet.style.height,maxHeight:sheet.style.maxHeight};
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 let focused=false,frame=0,disposed=false;
 function restoreSheet(){
  Object.assign(sheet.style,originalSheet);
  const height=getSheetMode?.()==='full'?'100%':(BUILDING_SHEET_RATIO*100)+'%';
  sheet.style.height=height;
  sheet.style.maxHeight=height;
 }
 function update(){
  frame=0;
  if(disposed||!mask.isConnected)return;
  pageLock.sync();
  if(!focused)return;
  if(getSheetMode?.()!=='half'){
   sheet.style.position='relative';
   sheet.style.top='';
   sheet.style.bottom='';
   sheet.style.height='100%';
   sheet.style.maxHeight='100%';
   return;
  }
  const gameHeight=game.getBoundingClientRect().height;
  const previewHeight=host.getBoundingClientRect().height*BUILDING_PREVIEW_RATIO;
  // Both game rect and visual viewport coordinates are layout-viewport CSS px.
  const gameTop=game.getBoundingClientRect().top-vv.offsetTop;
  const visible=keyboardSheetHeight(vv.height,previewHeight,
   gameHeight*BUILDING_SHEET_RATIO,gameTop);
  sheet.style.position='absolute';
  sheet.style.top=previewHeight+'px';
  sheet.style.bottom='auto';
  sheet.style.height=visible+'px';
  sheet.style.maxHeight=visible+'px';
  const input=document.activeElement;
  if(visible>0&&isField(input)&&sheet.contains(input)){
   const bounds=sheet.getBoundingClientRect();
   const row=(input.closest('.komo-tag-row')||input).getBoundingClientRect();
   const delta=focusedTagRowScrollDelta(bounds.top,bounds.bottom,row.top,row.bottom);
   if(Math.abs(delta)>2)sheet.scrollTop+=delta;
  }
 }
 function schedule(){
  if(!disposed&&!frame)frame=requestAnimationFrame(update);
 }
 function onFocusIn(event){
  if(!isField(event.target)||!sheet.contains(event.target))return;
  focused=true;
  schedule();
 }
 function onFocusOut(){
  // Switching between two tag fields also fires focusout; don't close the keyboard layout.
  requestAnimationFrame(()=>{
   if(disposed||!mask.isConnected)return;
   focused=isField(document.activeElement)&&sheet.contains(document.activeElement);
   if(focused)schedule();else restoreSheet();
  });
 }
 function onViewportChange(){
  if(disposed)return;
  pageLock.sync();
  schedule();
 }
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 vv.addEventListener('resize',onViewportChange);
 vv.addEventListener('scroll',onViewportChange);
 window.addEventListener('resize',onViewportChange);
 return {refresh:schedule,destroy(){
  if(disposed)return;
  disposed=true;
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  vv.removeEventListener('resize',onViewportChange);
  vv.removeEventListener('scroll',onViewportChange);
  window.removeEventListener('resize',onViewportChange);
  if(frame)cancelAnimationFrame(frame);
  restoreSheet();
  pageLock.release();
 }};
}
