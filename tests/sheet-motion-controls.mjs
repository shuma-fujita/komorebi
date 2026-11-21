import assert from 'node:assert/strict';
import {attachSheetMotion} from '../komorebi3d/maps/sheet-motion.js';

class FakeElement {
 constructor(){this.handlers=new Map();}
 addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(fn);}
 removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);}
 emit(type,event){for(const fn of this.handlers.get(type)||[])fn(event);}
 closest(selector){return null;}
}
globalThis.Element=FakeElement;
globalThis.window={matchMedia:()=>({matches:true})}; // no animations
const handle=new FakeElement();
const captures=new Set();
handle.setPointerCapture=id=>captures.add(id);
handle.hasPointerCapture=id=>captures.has(id);
handle.releasePointerCapture=id=>captures.delete(id);
const sheet={
 style:{},clientHeight:420,
 parentElement:{getBoundingClientRect:()=>({top:0,height:600})},
 getBoundingClientRect(){return {top:180,height:Number.parseFloat(this.style.height)||420};}
};
let dismissed=0;
const modes=[];
const motion=attachSheetMotion(sheet,handle,()=>dismissed++,mode=>modes.push(mode));
let prevented=0;
const button=new FakeElement();
button.closest=selector=>selector==='button'?button:null;
const pointer=(target,y,id=1)=>({
 target,pointerId:id,isPrimary:true,button:0,clientY:y,
 preventDefault(){prevented++;},stopPropagation(){}
});

// Buttons must remain true tap targets, not get captured by the grip drag.
handle.emit('pointerdown',pointer(button,200));
assert.equal(captures.size,0,'tapping explicit action button must not capture pointer');
assert.equal(prevented,0,'button pointerdown must not cancel its click');
handle.emit('pointermove',pointer(button,320));
handle.emit('pointerup',pointer(button,320));
assert.equal(dismissed,0);
assert.equal(modes.length,0,'button tap must not become drag-to-dismiss');

// The explicit expand/shrink action uses the existing sheet motion.
motion.toggle();
assert.equal(motion.getMode(),'full');
assert.equal(sheet.style.height,'600px');
motion.toggle();
assert.equal(motion.getMode(),'half');
assert.equal(sheet.style.height,'420px');
assert.deepEqual(modes,['full','half']);

// Native Safari grip dragging remains supported.
handle.emit('pointerdown',pointer(handle,180));
assert.equal(captures.has(1),true,'central grip must still capture its pointer');
handle.emit('pointermove',pointer(handle,30));
handle.emit('pointerup',pointer(handle,30));
assert.equal(motion.getMode(),'full','upward grip drag expands sheet');
assert.equal(captures.size,0,'pointer is released after grip drag');
motion.destroy();
console.log('sheet-motion tap controls and Safari grip drag: PASS');
