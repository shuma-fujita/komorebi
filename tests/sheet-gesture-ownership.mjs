import assert from 'node:assert/strict';
import {guardSheetScroll} from '../komorebi3d/maps/sheet-scroll-guard.js';
import {attachSheetMotion} from '../komorebi3d/maps/sheet-motion.js';

class Node{
 constructor(parentElement=null){
  this.parentElement=parentElement;this.style={};this.listeners=new Map();
  this.scrollHeight=0;this.clientHeight=0;this.scrollTop=0;
 }
 addEventListener(type,fn,opts={}){
  const phase=opts===true||opts?.capture===true?'capture':'bubble',key=type+':'+phase;
  if(!this.listeners.has(key))this.listeners.set(key,new Set());
  this.listeners.get(key).add(fn);
 }
 removeEventListener(type,fn,opts={}){
  const phase=opts===true||opts?.capture===true?'capture':'bubble';
  this.listeners.get(type+':'+phase)?.delete(fn);
 }
 emit(type,event,phase='bubble'){
  for(const fn of this.listeners.get(type+':'+phase)||[])fn(event);
 }
 contains(target){
  for(let node=target;node;node=node.parentElement)if(node===this)return true;
  return false;
 }
 getBoundingClientRect(){return {top:0,height:600,bottom:600};}
}
globalThis.Element=Node;
globalThis.window={matchMedia:()=>({matches:true})};
const mask=new Node(),sheet=new Node(mask),handle=new Node(sheet),content=new Node(sheet);
sheet.scrollHeight=1000;sheet.clientHeight=420;sheet.scrollTop=180;
sheet.getBoundingClientRect=()=>({top:180,height:Number.parseFloat(sheet.style.height)||420,bottom:600});
handle.pointerCaptures=new Set();
handle.setPointerCapture=id=>handle.pointerCaptures.add(id);
handle.hasPointerCapture=id=>handle.pointerCaptures.has(id);
handle.releasePointerCapture=id=>handle.pointerCaptures.delete(id);
let dismissCount=0;
const motion=attachSheetMotion(sheet,handle,()=>dismissCount++);
const guard=guardSheetScroll(mask,sheet,handle);
const event=(target,oldY,nextY)=>({
 target,cancelable:true,changedTouches:[{identifier:1,clientY:nextY}],
 defaultPrevented:false,propagationStopped:false,
 preventDefault(){this.defaultPrevented=true;},
 stopPropagation(){this.propagationStopped=true;}
});
function move(target,from,to){
 const start=event(target,from,from);
 mask.emit('touchstart',start,'capture');
 const e=event(target,from,to);
 mask.emit('touchmove',e,'capture');
 const captured={prevented:e.defaultPrevented,stopped:e.propagationStopped};
 mask.emit('touchmove',e,'bubble');
 mask.emit('touchend',event(target,to,to),'capture');
 return {captured,final:e};
}

// Grip must be protected from page-native scroll, even if sheet has room
// to scroll internally. The capture handler must not swallow the target event.
const gripMove=move(handle,200,275);
assert.equal(gripMove.captured.prevented,true,'grip always suppresses native page scroll');
assert.equal(gripMove.captured.stopped,false,'capture must not prevent grip target handlers');
assert.equal(gripMove.final.propagationStopped,true,'bubble prevents background listener leakage');
// Content scrolling should remain native and independent of the grip controller.
const scrollMove=move(content,250,210);
assert.equal(scrollMove.captured.prevented,false,'content can scroll inside the sheet');
sheet.scrollTop=0;
const boundaryMove=move(content,210,260);
assert.equal(boundaryMove.captured.prevented,true,'scroll chain stops at sheet boundary');
const outerMove=move(new Node(mask),200,260);
assert.equal(outerMove.captured.prevented,true,'preview cannot move background document');

// Original grip gestures are preserved (no alternative UI buttons).
const pointer=(y,id=1)=>({
 pointerId:id,isPrimary:true,button:0,clientY:y,target:handle,
 preventDefault(){},stopPropagation(){}
});
handle.emit('pointerdown',pointer(210));
assert.equal(handle.pointerCaptures.has(1),true,'pointer is captured by grip');
handle.emit('pointermove',pointer(105));
handle.emit('pointerup',pointer(105));
assert.equal(motion.getMode(),'full','drag up expands the existing sheet');
handle.emit('pointerdown',pointer(80,2));
assert.equal(handle.pointerCaptures.has(2),true);
motion.setKeyboardViewport(313,0);
assert.equal(handle.pointerCaptures.has(2),false,'keyboard reflow releases active grip pointer');
motion.setKeyboardViewport(null);
handle.emit('pointerdown',pointer(80));
handle.emit('pointermove',pointer(400));
handle.emit('pointerup',pointer(400));
assert.equal(dismissCount,1,'full -> below half dismiss works through original grip');
assert.equal(handle.pointerCaptures.size,0,'pointer is released');
guard.destroy();motion.destroy();
assert.equal(mask.listeners.get('touchmove:capture')?.size,0,'capture listeners are cleaned up');
assert.equal(mask.listeners.get('touchmove:bubble')?.size,0,'bubble listeners are cleaned up');
console.log('grip drag, scroll ownership, background prevention and cleanup: PASS (in-app browser pending)');
