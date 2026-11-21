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

// Interim safety regression: opening the editor must never lock the full page.
// The iPhone focus/Done scroll behavior is intentionally NOT claimed by this test.
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
const vv=emitter({height:530,offsetTop:0});
globalThis.window=emitter({visualViewport:vv,scrollY:450,matchMedia:()=>({matches:true}),location:{search:''}});
const body=new Node();body.style.position='';body.style.overflow='';
globalThis.document={body,activeElement:null};
const game=new Node();
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
document.activeElement=null;sheet.emit('focusout');flush();
assert.equal(game.style.position,originalGamePosition,'Done clears temporary game positioning');
assert.equal(game.style.top||'','','Done leaves no relative top offset');
assert.equal(body.style.position,'','Done does not leave the page locked');
binding.destroy();
assert.equal(sheet.style.position,'relative','closing restores original sheet mode');
console.log('editor keyboard math and no-body-lock regression: PASS (iOS layout unverified)');
