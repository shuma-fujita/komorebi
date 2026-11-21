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

// Reproduce a measured Safari viewport transition: pageY 495 -> 753 during
// keyboard display, and back to 495 after the visual viewport recovers.
// This is a deterministic lifecycle test, not an iPhone Safari device PASS.
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
globalThis.requestAnimationFrame=cb=>{const id=++frameId;frames.set(id,cb);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
const flush=()=>{for(let n=0;frames.size&&n<10;n++){const items=[...frames.values()];frames.clear();for(const fn of items)fn();}assert.equal(frames.size,0);};
const vv=emitter({height:641,offsetTop:0});
const scrollCalls=[];
globalThis.window=emitter({
 visualViewport:vv,scrollY:495,scrollX:0,
 scrollTo(x,y){scrollCalls.push([x,y]);this.scrollX=x;this.scrollY=y;},
 matchMedia:()=>({matches:true}),location:{search:''}
});
const body=new Node();body.style.position='';body.style.overflow='';
globalThis.document={body,activeElement:null};
const game=new Node();game.style.position='';game.style.top='';
const slot=new Node();slot.style.overflow='hidden';
game.getBoundingClientRect=()=>({top:160,height:800});
game.closest=sel=>sel==='.panel-slot-main'?slot:null;
const host=new Node();host.closest=sel=>sel==='.landscape-game'?game:null;
host.getBoundingClientRect=()=>({height:800});
const mask=new Node(),sheet=new Node(),previewTouch=new Node();
sheet.style.position='relative';sheet.style.height='70%';sheet.style.maxHeight='70%';
sheet.getBoundingClientRect=()=>({top:410,bottom:670,height:260});
const row=new Node();row.getBoundingClientRect=()=>({top:570,bottom:630});
const field=new Node();
field.closest=sel=>sel.startsWith('input,textarea')?field:sel==='.komo-tag-row'?row:null;
sheet.contains=node=>node===field;
const originalGamePosition=game.style.position||'';
const binding=attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode:()=> 'half'});
assert.equal(body.style.position,'','opening a tag editor does not pin the page');
assert.equal(game.style.position,originalGamePosition,'opening editor leaves the game in normal flow');
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
assert.equal(body.style.position,'','typing must not pin the entire page');
assert.equal(slot.style.overflow,'hidden','the parent must retain its clipping');
assert.equal(sheet.style.position,'absolute');
assert.ok(Number.parseFloat(sheet.style.height)>0,'the tag sheet must have visible height');
// Safari scrolls the page while the software keyboard is open.
window.scrollY=753;vv.height=313;vv.offsetTop=258;vv.emit('resize');flush();
assert.equal(game.style.position,'fixed','game remains fixed while keyboard is visible');
document.activeElement=null;sheet.emit('focusout');flush();
assert.equal(game.style.position,'fixed','blur must wait for viewport recovery before restoring');
assert.equal(window.scrollY,753,'page is not scrolled behind the still-open keyboard');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(game.style.position,originalGamePosition,'Done clears temporary game positioning');
assert.equal(game.style.top||'','','Done leaves no relative top offset');
assert.equal(window.scrollY,495,'Done returns to the exact pre-keyboard page position');
assert.deepEqual(scrollCalls,[[0,495]],'restore page only once after the keyboard closes');
assert.equal(body.style.position,'','Done does not leave the page locked');
assert.equal(slot.style.overflow,'hidden','parent clipping remains unchanged');
binding.destroy();
assert.equal(sheet.style.position,'relative','closing restores original sheet mode');

// Switching between two fields must not restore the page in the middle.
const binding2=attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode:()=> 'half'});
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=753;vv.height=313;vv.offsetTop=258;vv.emit('resize');flush();
sheet.emit('focusout');
sheet.emit('focusin',{target:field});flush();
assert.equal(game.style.position,'fixed','field-to-field focus keeps the editor fixed');
assert.equal(window.scrollY,753,'field-to-field focus does not reset scroll');
document.activeElement=null;sheet.emit('focusout');flush();
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
binding2.destroy();
assert.equal(window.scrollY,495,'field switch still restores the original page position');

// Closing the entire editor while the keyboard is still open also returns
// the page after the viewport has recovered, not during keyboard animation.
const binding3=attachEditorKeyboardLayout({host,mask,sheet,previewTouch,getSheetMode:()=> 'half'});
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=753;vv.height=313;vv.offsetTop=258;vv.emit('resize');flush();
binding3.destroy();
assert.equal(window.scrollY,753,'closing during the keyboard does not jump the page early');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,495,'closed editor restores page after keyboard recovery');
console.log('editor keyboard scroll restoration regression: PASS (iOS device verification pending)');
