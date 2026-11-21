import assert from 'node:assert/strict';
import {keyboardSheetHeight,focusedTagRowScrollDelta,attachEditorKeyboardLayout}
 from '../komorebi3d/maps/editor-keyboard-layout.js';
import {sheetGeometry,attachSheetMotion}
 from '../komorebi3d/maps/sheet-motion.js';
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO}
 from '../komorebi3d/maps/building-editor-layout.js';

assert.equal(keyboardSheetHeight(313,210,488),103);
assert.equal(keyboardSheetHeight(641,210,488),431);
assert.equal(keyboardSheetHeight(313,210,488,40),63);
assert.equal(focusedTagRowScrollDelta(600,800,680,760),2);
assert.equal(Math.round(sheetGeometry(700,'half').height),490);
assert.deepEqual(sheetGeometry(700,'half',313),{top:210,height:103});
assert.deepEqual(sheetGeometry(700,'full',313),{top:0,height:313});

function emitter(object={}){
 const handlers=new Map();
 return Object.assign(object,{
  addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},
  removeEventListener(type,fn){handlers.get(type)?.delete(fn);},
  emit(type,event={}){for(const fn of handlers.get(type)||[])fn(event);}
 });
}
class Node {
 constructor(){Object.assign(this,emitter());this.style={};this.scrollTop=0;this.clientHeight=0;this.isConnected=true;}
 closest(){return null;}
 contains(target){return this===target;}
 getBoundingClientRect(){return {top:0,bottom:0,height:0};}
}
globalThis.Element=Node;
let frameID=0;
const frames=new Map();
globalThis.requestAnimationFrame=fn=>{const id=++frameID;frames.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function flush(){
 for(let n=0;frames.size&&n<15;n++){
  const batch=[...frames.values()];frames.clear();
  for(const fn of batch)fn();
 }
 assert.equal(frames.size,0,'requestAnimationFrame must reach a stable state');
}
const vv=emitter({height:641,offsetTop:0});
const scrollCalls=[];
let coarse=true;
globalThis.window=emitter({
 visualViewport:vv,innerHeight:641,scrollX:0,scrollY:372,location:{search:''},
 matchMedia:()=>({matches:coarse}),
 scrollTo(x,y){scrollCalls.push([x,y]);this.scrollX=x;this.scrollY=y;}
});
const body=new Node();body.style.position='';body.style.overflow='';
globalThis.document={body,activeElement:null};
const slot=new Node();slot.style.overflow='hidden';
const game=new Node();
const stableGameStyles=JSON.stringify(game.style);
const stableHostStyles=JSON.stringify({});
const gameDocumentTop=380;
const gameHeight=699;
game.getBoundingClientRect=()=>({
 top:gameDocumentTop-window.scrollY,bottom:gameDocumentTop-window.scrollY+gameHeight,
 height:gameHeight,left:14,width:360
});
game.closest=sel=>sel==='.panel-slot-main'?slot:null;
const host=new Node();
host.closest=sel=>sel==='.landscape-game'?game:null;
host.getBoundingClientRect=()=>game.getBoundingClientRect();
const mask=new Node();
mask.getBoundingClientRect=()=>game.getBoundingClientRect();
const handle=new Node();
handle.parentElement=mask;
handle.setPointerCapture=()=>{};
handle.hasPointerCapture=()=>false;
handle.releasePointerCapture=()=>{};
const sheet=new Node();
sheet.parentElement=mask;
sheet.clientHeight=488;
sheet.style.position='relative';sheet.style.height='70%';sheet.style.maxHeight='70%';
sheet.getBoundingClientRect=()=>{
 const top=gameDocumentTop-window.scrollY+
  (sheet.style.position==='absolute'?Number.parseFloat(sheet.style.top):gameHeight-Number.parseFloat(sheet.style.height||'70')/100*gameHeight);
 const height=sheet.style.height.endsWith('%')?Number.parseFloat(sheet.style.height)/100*gameHeight:Number.parseFloat(sheet.style.height);
 return {top,bottom:top+height,height};
};
const field=new Node(),row=new Node();
field.closest=selector=>selector.startsWith('input,textarea')?field:selector==='.komo-tag-row'?row:null;
sheet.contains=target=>target===field;
row.getBoundingClientRect=()=>{
 const rect=sheet.getBoundingClientRect(),top=rect.top+48-sheet.scrollTop;
 return {top,bottom:top+48,height:48};
};
let dismissCount=0;
const motion=attachSheetMotion(sheet,handle,()=>dismissCount++);
const binding=attachEditorKeyboardLayout({
 host,mask,sheet,onViewportChange:(height,top)=>motion.setKeyboardViewport(height,top)
});
const assertPanelUnchanged=()=>{
 assert.equal(JSON.stringify(game.style),stableGameStyles,'editor must never change game CSS');
 assert.equal(JSON.stringify(host.style),stableHostStyles,'editor must never change WebGL surface CSS');
 assert.equal(slot.style.overflow,'hidden','existing panel slot clipping is preserved');
 assert.equal(body.style.position,'','body is never position:fixed');
};
assertPanelUnchanged();
assert.equal(sheet.style.height,'70%','editor starts as panel-local 70% sheet');
document.activeElement=field;
sheet.emit('focusin',{target:field});flush();
assertPanelUnchanged();
assert.equal(sheet.style.height,'70%','focusing does not prematurely resize game/sheet');
window.scrollY=769;vv.height=313;vv.offsetTop=328;
vv.emit('resize');flush();
assertPanelUnchanged();
assert.equal(window.scrollY,380,'Safari scroll is corrected by normal document scroll, not game CSS');
assert.equal(game.getBoundingClientRect().top,0,'game stays at its natural document position');
assert.equal(sheet.style.position,'absolute','only the sheet changes position with keyboard');
assert.equal(Math.round(Number.parseFloat(sheet.style.height)),103,'sheet fits above keyboard after preview');
assert.equal(Math.round(Number.parseFloat(sheet.style.top)),210,'preview keeps its 30% panel-local height');
// A followup document scroll event does not introduce a second geometry owner.
window.emit('scroll');flush();
assertPanelUnchanged();
assert.equal(Math.round(Number.parseFloat(sheet.style.height)),103);
document.activeElement=null;sheet.emit('focusout');flush();
assert.equal(sheet.style.position,'absolute','Done keeps keyboard-safe sheet until viewport recovers');
assertPanelUnchanged();
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,372,'Done restores the pre-focus page scroll');
assert.equal(game.getBoundingClientRect().top,8,'game is back at its original on-page position');
assert.equal(sheet.style.position,'relative');
assert.equal(sheet.style.height,'70%');
assertPanelUnchanged();

// Changing fields while keyboard stays visible must not reset the page.
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=769;vv.height=313;vv.offsetTop=328;vv.emit('resize');flush();
sheet.emit('focusout');sheet.emit('focusin',{target:field});flush();
assert.equal(window.scrollY,380,'focus switch retains keyboard-aware document scroll');
assert.equal(sheet.style.position,'absolute');
assertPanelUnchanged();
document.activeElement=null;sheet.emit('focusout');flush();
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,372);

// Full sheet is still constrained to the visible viewport when keyboard opens.
motion.toggle();assert.equal(motion.getMode(),'full');
assert.equal(sheet.style.height,'100%');
document.activeElement=field;sheet.emit('focusin',{target:field});flush();
window.scrollY=769;vv.height=313;vv.offsetTop=328;vv.emit('resize');flush();
assert.equal(motion.getMode(),'full');
assert.equal(Math.round(Number.parseFloat(sheet.style.height)),313);
assert.equal(sheet.style.top,'0px');
assertPanelUnchanged();
// Closing during keyboard dismissal should not pin the game or leave the page scrolled.
motion.destroy();
binding.destroy();
assertPanelUnchanged();
assert.equal(window.scrollY,380,'editor removal does not restore scroll before keyboard recovery');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,372,'editor removal restores normal page position after keyboard closes');
assertPanelUnchanged();

// The same editor must not reposition the game on desktop or without VV keyboard.
coarse=false;
const desktopMotion=attachSheetMotion(sheet,handle,()=>{});
const desktop=attachEditorKeyboardLayout({
 host,mask,sheet,onViewportChange:(height,top)=>desktopMotion.setKeyboardViewport(height,top)
});
document.activeElement=field;sheet.emit('focusin',{target:field});
vv.height=313;vv.emit('resize');flush();
assertPanelUnchanged();
desktop.destroy();desktopMotion.destroy();
assert.equal(dismissCount,0);
console.log('panel-local editor, iOS keyboard, sheet geometry and unchanged game layout: PASS (real-device verification pending)');
