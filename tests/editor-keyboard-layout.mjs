import assert from 'node:assert/strict';
import {keyboardSheetHeight,focusedTagRowScrollDelta,attachEditorKeyboardLayout}
 from '../komorebi3d/maps/editor-keyboard-layout.js';
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO}
 from '../komorebi3d/maps/building-editor-layout.js';

const total=600,preview=total*BUILDING_PREVIEW_RATIO,sheet=total*BUILDING_SHEET_RATIO;
assert.equal(keyboardSheetHeight(800,preview,sheet),sheet);
assert.equal(keyboardSheetHeight(500,preview,sheet),Math.min(sheet,500-preview));
assert.equal(keyboardSheetHeight(350,preview,sheet),Math.max(0,350-preview));
assert.equal(keyboardSheetHeight(100,preview,sheet),0);
assert.equal(keyboardSheetHeight(500,preview,sheet,110),Math.min(sheet,500-110-preview),
 'the game may start below the visible viewport top');
assert.equal(focusedTagRowScrollDelta(600,800,680,760),2);
assert.equal(focusedTagRowScrollDelta(600,800,710,790),32);
assert.equal(focusedTagRowScrollDelta(600,800,640,720),-38);

// Exercise the DOM lifecycle. A math-only test cannot detect a game panel
// being taken out of flow or an orphaned 110svh parent slot.
function emitter(obj={}){
 const listeners=new Map();
 return Object.assign(obj,{
  addEventListener(type,fn){
   if(!listeners.has(type))listeners.set(type,new Set());
   listeners.get(type).add(fn);
  },
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  emit(type,event={}){for(const fn of [...(listeners.get(type)||[])])fn(event);}
 });
}
class MockElement{
 constructor(){Object.assign(this,emitter());this.style={};this.isConnected=true;this.scrollTop=0;}
 closest(){return null;}
 getBoundingClientRect(){return {top:0,bottom:0,height:0};}
 contains(el){return this===el;}
}
globalThis.Element=MockElement;
const body=new MockElement();
body.style={position:'',top:'',left:'',right:'',width:'',overflow:'',overscrollBehavior:''};
globalThis.document={body,activeElement:null};
let currentScrollY=430;
const vv=emitter({offsetTop:0,height:760});
const win=emitter({visualViewport:vv,scrollX:0,
 get scrollY(){return currentScrollY;},
 matchMedia:()=>({matches:true}),
 scrollTo(x,y){assert.equal(x,0);currentScrollY=y;}
});
globalThis.window=win;
const frames=new Map();
let frameId=0;
globalThis.requestAnimationFrame=cb=>{const id=++frameId;frames.set(id,cb);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function flush(){
 for(let n=0;frames.size&&n<12;n++){
  const pending=[...frames.values()];frames.clear();for(const fn of pending)fn();
 }
 assert.equal(frames.size,0,'animation callbacks must settle');
}
const gameSlot=new MockElement();gameSlot.style.overflow='hidden';
const game=new MockElement();
game.style.position='';
game.getBoundingClientRect=()=>({top:180,bottom:900,height:720});
game.closest=selector=>selector==='.panel-slot-main'?gameSlot:null;
const host=new MockElement();
host.closest=selector=>selector==='.landscape-game'?game:null;
host.getBoundingClientRect=()=>({height:720});
const mask=new MockElement();
const tagSheet=new MockElement();
tagSheet.style={position:'relative',height:'70%',maxHeight:'70%',top:'',bottom:''};
tagSheet.scrollTop=200;
const field=new MockElement(),row=new MockElement();
field.closest=selector=>selector.startsWith('input,textarea')?field:
 selector==='.komo-tag-row'?row:null;
row.getBoundingClientRect=()=>({top:430,bottom:490});
tagSheet.contains=el=>el===field;
tagSheet.getBoundingClientRect=()=>({top:396,bottom:560,height:164});

const edit=attachEditorKeyboardLayout({host,mask,sheet:tagSheet,
 previewTouch:new MockElement(),getSheetMode:()=> 'half'});
assert.equal(body.style.position,'fixed','lock only the page behind the modal');
assert.equal(body.style.top,'-430px','hold document at its pre-editor scroll position');
assert.equal(game.style.position,'','game must stay in normal panel flow');
assert.equal(gameSlot.style.overflow,'hidden','parent overflow remains unchanged');
document.activeElement=field;
vv.height=515;vv.offsetTop=35;
tagSheet.emit('focusin',{target:field});
vv.emit('resize');flush();
assert.equal(body.style.top,'-395px','visual viewport pan is compensated on the body');
assert.equal(tagSheet.style.position,'absolute');
assert.ok(parseFloat(tagSheet.style.height)>=0);
assert.notEqual(tagSheet.scrollTop,200,'focused tag row can still be centered inside the sheet');
assert.equal(game.style.position,'','keyboard opening must never fix the game');
document.activeElement=null;
tagSheet.emit('focusout');flush();
vv.height=760;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(tagSheet.style.position,'relative','dismiss keyboard restores sheet mode');
assert.equal(body.style.position,'fixed','keyboard Done must not unlock or scroll the page');
assert.equal(body.style.top,'-430px','viewport returns without moving the game');
assert.equal(game.style.position,'','keyboard Done never creates relative/fixed offsets');
assert.equal(gameSlot.style.overflow,'hidden','no clipping override');
assert.equal(currentScrollY,430,'keyboard Done never scrolls the page');
edit.destroy();
assert.equal(body.style.position,'','closing editor unlocks the page');
assert.equal(body.style.top,'','no residual positioning or blank layout region');
assert.equal(currentScrollY,430,'closing editor restores original scroll position');
assert.equal(tagSheet.style.position,'relative','original sheet styling restored');
assert.equal(game.style.position,'','game layout left untouched');
console.log('editor keyboard sizing + no-game-reflow modal lifecycle: PASS');
