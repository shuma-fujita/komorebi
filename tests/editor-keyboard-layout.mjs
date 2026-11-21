import assert from 'node:assert/strict';
import {keyboardSheetHeight,focusedTagRowScrollDelta,attachEditorKeyboardLayout}
 from '../komorebi3d/maps/editor-keyboard-layout.js';
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO}
 from '../komorebi3d/maps/building-editor-layout.js';

const full=600,preview=full*BUILDING_PREVIEW_RATIO,half=full*BUILDING_SHEET_RATIO;
assert.equal(keyboardSheetHeight(800,preview,half),half);
assert.equal(keyboardSheetHeight(500,preview,half),Math.min(half,500-preview));
assert.equal(keyboardSheetHeight(350,preview,half),Math.max(0,350-preview));
assert.equal(keyboardSheetHeight(100,preview,half),0);
assert.equal(focusedTagRowScrollDelta(600,800,680,760),2);
assert.equal(focusedTagRowScrollDelta(600,800,710,790),32);
assert.equal(focusedTagRowScrollDelta(600,800,640,720),-38);

// The screenshot regression is not just a wrong scrollY:
// the editor stays open after keyboard Done, so the game must remain pinned.
// Only closing the editor itself may restore normal flow.
function emitter(object={}){
 const handlers=new Map();
 return Object.assign(object,{
  addEventListener(key,fn){if(!handlers.has(key))handlers.set(key,new Set());handlers.get(key).add(fn);},
  removeEventListener(key,fn){handlers.get(key)?.delete(fn);},
  emit(key,event={}){for(const fn of handlers.get(key)||[])fn(event);}
 });
}
class Node{
 constructor(){Object.assign(this,emitter());this.style={};this.scrollTop=0;this.isConnected=true;}
 closest(){return null;}
 getBoundingClientRect(){return {top:0,bottom:0,height:0};}
 contains(el){return this===el;}
}
globalThis.Element=Node;
let frameId=0;
const frames=new Map();
globalThis.requestAnimationFrame=fn=>{const id=++frameId;frames.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
const flush=()=>{for(let n=0;frames.size&&n<10;n++){
 const callbacks=[...frames.values()];frames.clear();
 for(const callback of callbacks)callback();
}assert.equal(frames.size,0);};
const vv=emitter({height:641,offsetTop:0});
let coarse=true;
const scrollCalls=[];
globalThis.window=emitter({
 innerHeight:641,visualViewport:vv,scrollY:372,scrollX:0,
 scrollTo(x,y){scrollCalls.push([x,y]);this.scrollX=x;this.scrollY=y;},
 matchMedia:()=>({matches:coarse}),location:{search:''}
});
const body=new Node();body.style.position='';body.style.overflow='';
globalThis.document={body,activeElement:null};
const game=new Node();game.style.position='';game.style.top='';
const slot=new Node();slot.style.overflow='hidden';
game.getBoundingClientRect=()=>({
 top:game.style.position==='fixed'?vv.offsetTop:8,
 height:game.style.position==='fixed'?Number.parseFloat(game.style.height):699,
 left:34,width:644
});
game.closest=sel=>sel==='.panel-slot-main'?slot:null;
const host=new Node();host.closest=sel=>sel==='.landscape-game'?game:null;
host.getBoundingClientRect=()=>({height:game.getBoundingClientRect().height});
const mask=new Node(),sheet=new Node(),previewTouch=new Node();
sheet.style.position='relative';sheet.style.height='70%';sheet.style.maxHeight='70%';
sheet.getBoundingClientRect=()=>({top:210,bottom:420,height:210});
const row=new Node();row.getBoundingClientRect=()=>({top:280,bottom:340});
const field=new Node();field.closest=sel=>sel.startsWith('input,textarea')?field:sel==='.komo-tag-row'?row:null;
sheet.contains=node=>node===field;

const originalPosition=game.style.position;
const binding=attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode:()=> 'half'});
assert.equal(game.style.position,'fixed','opening editor immediately pins game');
assert.equal(game.style.top,'0px','editor pins to viewport, even when opened lower on page');
assert.equal(game.style.height,'641px','editor fits the full mobile layout viewport');
assert.equal(sheet.style.position,'relative','unfocused sheet starts in its normal layout');
assert.equal(body.style.position,'','never lock body while editor is open');
assert.equal(slot.style.overflow,'hidden','parent clipping stays untouched');
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=769;vv.height=313;vv.offsetTop=328;vv.emit('resize');flush();
assert.equal(game.style.position,'fixed');
assert.equal(game.style.top,'328px','game follows the visual viewport');
assert.equal(sheet.style.position,'absolute','focused sheet becomes keyboard-aware');
assert.ok(Number.parseFloat(sheet.style.height)>0);
document.activeElement=null;sheet.emit('focusout');flush();
assert.equal(game.style.position,'fixed','Done must not unpin the still-open editor');
assert.equal(window.scrollY,769,'no premature page scroll while keyboard is open');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,372,'keyboard Done returns page to pre-focus scroll');
assert.equal(game.style.position,'fixed','Done preserves editor full-screen positioning');
assert.equal(game.style.top,'0px');
assert.equal(sheet.style.position,'relative','Done restores 70% tag sheet');
assert.equal(sheet.style.height,'70%');

// Focus switching is not keyboard dismissal.
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=769;vv.height=313;vv.offsetTop=328;vv.emit('resize');flush();
sheet.emit('focusout');
sheet.emit('focusin',{target:field});flush();
assert.equal(window.scrollY,769,'switching fields does not reset the page');
assert.equal(game.style.position,'fixed');
document.activeElement=null;sheet.emit('focusout');flush();
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,372);
assert.equal(game.style.position,'fixed');
binding.destroy();
assert.equal(game.style.position,originalPosition,'only closing the editor unpins game');
assert.equal(game.style.top||'','','closing restores game top style');
assert.equal(body.style.position,'','closing does not leave body locked');

// If the editor is dismissed while the keyboard is still up, keep the game
// pinned until the visual viewport actually recovers.
window.scrollY=495;
const binding2=attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode:()=> 'half'});
assert.equal(game.style.position,'fixed');
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=753;vv.height=313;vv.offsetTop=258;vv.emit('resize');flush();
binding2.destroy();
assert.equal(game.style.position,'fixed','close must not unpin during keyboard animation');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,495,'editor dismissal restores pre-editor scroll');
assert.equal(game.style.position,originalPosition,'unpin after viewport recovery');

// Desktop keyboard must not create a mobile fixed editor.
coarse=false;
const desktop=attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode:()=> 'half'});
assert.equal(game.style.position,originalPosition);
desktop.destroy();
assert.equal(body.style.position,'');
console.log('editor fixed-lifetime and keyboard viewport regression: PASS (Safari device verification pending)');
