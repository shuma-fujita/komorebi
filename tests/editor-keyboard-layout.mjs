import assert from 'node:assert/strict';
import {focusedTagRowScrollDelta,attachEditorKeyboardLayout}
 from '../komorebi3d/maps/editor-keyboard-layout.js';
import {attachSheetMotion}
 from '../komorebi3d/maps/sheet-motion.js';

// Only form scroll is needed: position the active tag just below the grip.
assert.equal(focusedTagRowScrollDelta(200,360,36,8),116);
assert.equal(focusedTagRowScrollDelta(200,244,36,8),0);

function emitter(object={}){
 const listeners=new Map();
 return Object.assign(object,{
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  emit(type,event={}){for(const fn of listeners.get(type)||[])fn(event);}
 });
}
class Node{
 constructor(){Object.assign(this,emitter());this.style={};this.scrollTop=0;this.clientHeight=0;this.isConnected=true;}
 closest(){return null;}
 contains(target){return this===target;}
 getBoundingClientRect(){return {top:0,bottom:0,height:0};}
}
globalThis.Element=Node;
let frameID=0;const frames=new Map();
globalThis.requestAnimationFrame=fn=>{const id=++frameID;frames.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function flush(){
 for(let i=0;frames.size&&i<20;i++){
  const pending=[...frames.values()];frames.clear();
  for(const fn of pending)fn();
 }
 assert.equal(frames.size,0,'requestAnimationFrame must stabilize');
}
let timerID=0;const timers=new Map();
globalThis.setTimeout=(fn,ms)=>{const id=++timerID;timers.set(id,{fn,ms});return id;};
globalThis.clearTimeout=id=>timers.delete(id);
const vv=emitter({height:641,offsetTop:0});
const scrollCalls=[];
globalThis.window=emitter({
 innerHeight:641,visualViewport:vv,scrollX:0,scrollY:372,
 location:{search:''},
 matchMedia:query=>({matches:query.includes('reduced-motion')}),
 scrollTo(x,y){scrollCalls.push([x,y]);this.scrollX=x;this.scrollY=y;}
});
globalThis.document={activeElement:null,body:new Node()};
const game=new Node(),host=new Node(),mask=new Node(),handle=new Node(),sheet=new Node();
game.style.position='';host.style.position='';
host.closest=sel=>sel==='.landscape-game'?game:null;
mask.isConnected=true;
mask.getBoundingClientRect=()=>({height:699,top:380-window.scrollY});
sheet.parentElement=mask;
sheet.clientHeight=488;
sheet.style.height='70%';sheet.style.maxHeight='70%';
sheet.getBoundingClientRect=()=>{
 const value=Number.parseFloat(sheet.style.height);
 const h=sheet.style.height.endsWith('%')?699*value/100:value;
 const top=380-window.scrollY+699-h;
 return {top,bottom:top+h,height:h};
};
handle.getBoundingClientRect=()=>({height:36});
handle.pointers=new Set();
handle.setPointerCapture=id=>handle.pointers.add(id);
handle.hasPointerCapture=id=>handle.pointers.has(id);
handle.releasePointerCapture=id=>handle.pointers.delete(id);
const row1=new Node(),row2=new Node(),field1=new Node(),field2=new Node();
const rowBounds=offset=>()=>{
 const top=sheet.getBoundingClientRect().top+offset-sheet.scrollTop;
 return {top,bottom:top+48,height:48};
};
row1.getBoundingClientRect=rowBounds(140);
row2.getBoundingClientRect=rowBounds(360);
field1.closest=sel=>sel.startsWith('input,textarea')?field1:sel==='.komo-tag-row'?row1:null;
field2.closest=sel=>sel.startsWith('input,textarea')?field2:sel==='.komo-tag-row'?row2:null;
sheet.contains=el=>el===field1||el===field2;
const gameStyle=JSON.stringify(game.style),hostStyle=JSON.stringify(host.style);
const assertLayout=()=>{
 assert.equal(sheet.style.position,'relative','form always remains in normal game panel flow');
 assert.equal(sheet.style.top||'','','no absolute positioning for keyboard');
 assert.equal(sheet.style.height,'70%','form is always 70% in half mode');
 assert.equal(sheet.style.maxHeight,'70%','no keyboard-driven height cap');
 assert.equal(JSON.stringify(game.style),gameStyle,'game element is never repositioned');
 assert.equal(JSON.stringify(host.style),hostStyle,'WebGL host is never repositioned');
 assert.equal(document.body.style.position,undefined,'body has no fixed lock');
};
let dismissed=0;
const motion=attachSheetMotion(sheet,handle,()=>dismissed++);
const keyboard=attachEditorKeyboardLayout({host,mask,sheet,handle});
assertLayout();

// First focus: move the target below the sticky grip by scrolling the form.
document.activeElement=field1;sheet.emit('focusin',{target:field1});flush();
assert.equal(sheet.scrollTop,96,'first tag is aligned at the top of the 70% form');
assertLayout();
assert.equal(scrollCalls.length,0,'focus never calls document scrollTo');
// iOS opens the keyboard and pans the whole page. Neither event changes
// game/sheet proportions or tries to fight the document scroll.
window.scrollY=769;vv.height=313;vv.offsetTop=328;vv.emit('resize');flush();
assert.equal(sheet.scrollTop,96);
assertLayout();
assert.equal(scrollCalls.length,0);

// Moving to another input must scroll *that* row only, not restore the page.
sheet.emit('focusout',{target:field1});
document.activeElement=field2;sheet.emit('focusin',{target:field2});flush();
assert.equal(sheet.scrollTop,316,'second tag moved under grip inside the form');
assert.equal(scrollCalls.length,0,'switching inputs never moves document');
assertLayout();
// Repeated viewport changes must not create a scroll feedback loop.
vv.emit('resize');vv.emit('resize');flush();
assert.equal(sheet.scrollTop,316);
assert.equal(scrollCalls.length,0);
assertLayout();

// Checkmark closes the keyboard while editor remains open. One restore is
// permitted after the visual viewport has recovered, with no game CSS writes.
document.activeElement=null;sheet.emit('focusout',{target:field2});flush();
assert.equal(window.scrollY,769,'do not restore while keyboard is still showing');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,372,'Done restores the original document scroll');
assert.deepEqual(scrollCalls,[[0,372]]);
assertLayout();

// The original full-screen swipe/keyboard-toggle mode stays independent.
motion.toggle();assert.equal(motion.getMode(),'full');
assert.equal(sheet.style.height,'100%');
document.activeElement=field1;sheet.emit('focusin',{target:field1});flush();
vv.height=313;vv.emit('resize');flush();
assert.equal(sheet.style.height,'100%','focused input never changes full-sheet mode');
assert.equal(JSON.stringify(game.style),gameStyle);
assert.equal(JSON.stringify(host.style),hostStyle);

// Closing the editor while iOS is still hiding the keyboard keeps document
// restore deferred; no game fixed positioning is ever introduced.
window.scrollY=753;keyboard.destroy();motion.destroy();
assert.equal(window.scrollY,753);
assert.equal(JSON.stringify(game.style),gameStyle);
vv.height=641;vv.emit('resize');flush();
assert.equal(window.scrollY,372,'closing editor restores page after keyboard recovery');
assert.equal(dismissed,0);
console.log('focused tag internal-scroll + unchanged panel proportions: PASS (device verification pending)');
