// Keep touch focus from automatically scrolling the editor or the document.
// Keyboard visibility, content scrolling and page position are left to Safari.
// This module does not insert spacer content or adjust any scroll position.
export function attachEditorKeyboardLayout({host,mask,sheet}){
 const game=host.closest('.landscape-game');
 const vv=window.visualViewport;
 const mobile=window.matchMedia?.('(pointer:coarse)')?.matches===true;
 const isField=el=>el instanceof Element&&Boolean(el.closest('input,textarea,select,[contenteditable="true"]'));
 let disposed=false,diagnostic=null;
 function onPointerDown(event){
  // Preserve native tap handling for keyboard and caret placement, but
  // request no focus-triggered scrolling for trusted touch input.
  const target=event.target;
  if(!mobile||event.pointerType!=='touch'||!isField(target)||
   !sheet.contains(target)||target.disabled||document.activeElement===target)return;
  target.focus({preventScroll:true});
 }
 sheet.addEventListener('pointerdown',onPointerDown,true);
 if(window.location?.search&&new URLSearchParams(window.location.search).get('editorDiag')==='1'&&vv&&game){
  import('./editor-keyboard-diagnostics.js?v=tag-focus-origin-row-20261121').then(mod=>{
   if(disposed||!mask.isConnected)return;
   diagnostic=mod.attachEditorKeyboardDiagnostics({game,host,mask,sheet});
  }).catch(error=>console.warn('editor trace unavailable',error));
 }
 return {destroy(){
  if(disposed)return;
  disposed=true;
  diagnostic?.destroy();
  sheet.removeEventListener('pointerdown',onPointerDown,true);
 }};
}

/* Enter/Done on a newly added tag key advances to that row's value field.
   Keep iOS keyboard focus changes synchronous and avoid script-driven scrolling. */
export function attachNewTagKeyNext(keyField,valueField){
 keyField.enterKeyHint='next';
 let composing=false;
 keyField.addEventListener('compositionstart',()=>{composing=true;});
 keyField.addEventListener('compositionend',()=>{composing=false;});
 keyField.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||composing||event.isComposing||event.keyCode===229)return;
  event.preventDefault();
  valueField.focus({preventScroll:true});
 });
}
