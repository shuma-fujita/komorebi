import assert from 'node:assert/strict';
import {attachEditorKeyboardLayout,coveredFieldScrollDelta} from '../komorebi3d/maps/editor-keyboard-layout.js';
import {attachSheetMotion} from '../komorebi3d/maps/sheet-motion.js';

// Real-device geometry showed a focused input ending at y=362 while
// Safari's keyboard reduced visual viewport to 313. Move only the covered
// portion INSIDE the sheet on keyboard resize, before WebKit pans at input.
// No tag alignment on focus and no document scroll correction while typing.
assert.equal(coveredFieldScrollDelta(362,313),73);
assert.equal(coveredFieldScrollDelta(260,313),0);
assert.equal(coveredFieldScrollDelta(313,313),24);
function emitter(object={}){
 const listeners=new Map();
 return Object.assign(object,{
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  emit(type,event={}){for(const fn of listeners.get(type)||[])fn(event);},
  listenerCount(type){return listeners.get(type)?.size||0;}
 });
}
class Node{
 constructor(){Object.assign(this,emitter());this.style={};this.scrollTop=0;this.isConnected=true;this.disabled=false;}
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
 assert.equal(frames.size,0,'requestAnimationFrame must settle');
}
let timerID=0;const timers=new Map();
globalThis.setTimeout=(fn,ms)=>{const id=++timerID;timers.set(id,{fn,ms});return id;};
globalThis.clearTimeout=id=>timers.delete(id);
const vv=emitter({height:641,offsetTop:0});
const scrollCalls=[];
globalThis.window=emitter({
 innerHeight:641,visualViewport:vv,scrollX:0,scrollY:423,
 location:{search:''},matchMedia:query=>({matches:query.includes('pointer:coarse')||query.includes('reduced-motion')}),
 scrollTo(x,y){scrollCalls.push([x,y]);this.scrollX=x;this.scrollY=y;}
});
globalThis.document={activeElement:null,body:new Node()};
const game=new Node(),host=new Node(),mask=new Node(),handle=new Node(),sheet=new Node();
host.closest=selector=>selector==='.landscape-game'?game:null;
sheet.parentElement=mask;sheet.clientHeight=488;sheet.scrollHeight=1300;
mask.getBoundingClientRect=()=>({height:700,top:380-window.scrollY});
handle.setPointerCapture=()=>{};handle.hasPointerCapture=()=>false;handle.releasePointerCapture=()=>{};
const fields=[new Node(),new Node(),new Node()];
fields[0].getBoundingClientRect=()=>({top:321-sheet.scrollTop,bottom:362-sheet.scrollTop,height:41});
fields[1].getBoundingClientRect=()=>({top:420-sheet.scrollTop,bottom:461-sheet.scrollTop,height:41});
fields[2].getBoundingClientRect=()=>({top:200-sheet.scrollTop,bottom:241-sheet.scrollTop,height:41});
sheet.getBoundingClientRect=()=>({top:7,bottom:495,height:488});
for(const field of fields){
 field.closest=selector=>selector.startsWith('input,textarea')?field:null;
 field.focusCalls=[];
 field.focus=options=>{
  field.focusCalls.push(options);
  document.activeElement=field;
  sheet.emit('focusin',{target:field});
 };
}
sheet.contains=target=>fields.includes(target);
const gameStyles=JSON.stringify(game.style),hostStyles=JSON.stringify(host.style);
const verifyNoLayoutChange=()=>{
 assert.equal(sheet.style.height,'70%','sheet keeps its 70% height');
 assert.equal(sheet.style.maxHeight,'70%','sheet retains the 70% maximum');
 assert.equal(sheet.style.position,'relative','sheet position remains unchanged');
 // Internal scrolling is allowed only to reveal a keyboard-covered input.
 assert.equal(JSON.stringify(game.style),gameStyles,'game is not repositioned');
 assert.equal(JSON.stringify(host.style),hostStyles,'WebGL host is not repositioned');
};
let dismissed=0;
const motion=attachSheetMotion(sheet,handle,()=>dismissed++);
const keyboard=attachEditorKeyboardLayout({host,mask,sheet});
verifyNoLayoutChange();

const pointer=(target,pointerType='touch')=>({target,pointerType});
sheet.emit('pointerdown',pointer(fields[0]));
assert.deepEqual(fields[0].focusCalls,[{preventScroll:true}],
 'touch focus requests Safari not to perform focus scrolling');
assert.equal(document.activeElement,fields[0]);
assert.equal(scrollCalls.length,0,'focus handler does not call page scrollTo');
verifyNoLayoutChange();
assert.equal(sheet.scrollTop,0,'focus itself never scrolls the tag list');
// Keyboard opens without Safari document scroll. The input is partially
// hidden at 362px, beyond keyboard boundary 313px.
vv.height=313;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(sheet.scrollTop,73,'only 73px of keyboard occlusion is revealed in sheet');
assert.equal(fields[0].getBoundingClientRect().bottom,289,'24px clearance is kept');
assert.equal(window.scrollY,423,'opening keyboard never triggers JS document scrolling');
assert.equal(scrollCalls.length,0);
verifyNoLayoutChange();

// Focus switching should not trigger tag scroll or an early page restore.
sheet.emit('focusout',{target:fields[0]});
sheet.emit('pointerdown',pointer(fields[1]));
flush();
assert.deepEqual(fields[1].focusCalls,[{preventScroll:true}]);
assert.equal(sheet.scrollTop,172,'new field is revealed inside sheet with same 24px clearance');
assert.equal(fields[1].getBoundingClientRect().bottom,289);
assert.equal(scrollCalls.length,0);
verifyNoLayoutChange();
// Already-focused inputs are left to the native caret handling.
sheet.emit('pointerdown',pointer(fields[1]));
assert.equal(fields[1].focusCalls.length,1);
// Mouse focus is still native; we only experiment with touch.
sheet.emit('pointerdown',pointer(fields[2],'mouse'));
assert.equal(fields[2].focusCalls.length,0);
verifyNoLayoutChange();
// Typing does not execute a JavaScript page-scroll or endless viewport loop.
sheet.emit('beforeinput',{target:fields[1]});
sheet.emit('input',{target:fields[1]});
flush();
assert.equal(sheet.scrollTop,172,'typing itself does not re-align tag rows');
assert.equal(window.scrollY,423,'typing itself does not trigger JS page scroll');
assert.equal(scrollCalls.length,0);
// Simulate a browser-native page pan anyway to keep Done restoration covered.
window.scrollY=462;vv.offsetTop=39;
document.activeElement=null;sheet.emit('focusout',{target:fields[1]});flush();
assert.equal(window.scrollY,462,'do not restore while keyboard is visible');
vv.height=641;vv.offsetTop=0;vv.emit('resize');flush();
assert.equal(window.scrollY,423);
assert.deepEqual(scrollCalls,[[0,423]],'Done restores the initial page position once');
verifyNoLayoutChange();

// Closing the editor while the keyboard is open keeps the restore delayed.
sheet.emit('pointerdown',pointer(fields[2]));flush();
window.scrollY=700;vv.height=313;vv.emit('resize');flush();
keyboard.destroy();
assert.equal(sheet.listenerCount('pointerdown'),0,'remove touch capture handler on destroy');
assert.equal(window.scrollY,700,'no page correction while keyboard is opening or open');
vv.height=641;vv.emit('resize');flush();
assert.equal(window.scrollY,423,'restore document after keyboard closes');
motion.destroy();
verifyNoLayoutChange();
assert.equal(dismissed,0);
console.log('keyboard-covered-field reveal and unchanged 30/70 panel: PASS (real iPhone unverified)');
