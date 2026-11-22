import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {attachEditorKeyboardLayout,attachNewTagKeyNext} from '../komorebi3d/maps/editor-keyboard-layout.js';
import {attachSheetMotion} from '../komorebi3d/maps/sheet-motion.js';
import {tagFieldLocation} from '../komorebi3d/maps/editor-keyboard-diagnostics.js';

// Regression: only focus({preventScroll:true}) is ours. Safari owns keyboard
// scrolling, normal content scrolling, and the page position on dismissal.
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
 constructor(){Object.assign(this,emitter());this.style={};this.children=[];this.scrollTop=0;this.isConnected=true;this.disabled=false;this.parentElement=null;}
 closest(){return null;}
 contains(target){return this===target;}
 appendChild(child){child.parentElement=this;this.children.push(child);return child;}
 getBoundingClientRect(){return {top:0,bottom:0,height:0};}
}
globalThis.Element=Node;
// The opt-in diagnostic never reads or prints OSM key names/values.
const diagRows=new Node(),diagRow1=new Node(),diagRow2=new Node();
diagRows.appendChild(diagRow1);diagRows.appendChild(diagRow2);
const diagInputs=[new Node(),new Node(),new Node(),new Node()];
diagRow1.appendChild(diagInputs[0]);diagRow1.appendChild(diagInputs[1]);
diagRow2.appendChild(diagInputs[2]);diagRow2.appendChild(diagInputs[3]);
for(const row of [diagRow1,diagRow2])row.closest=selector=>selector==='.komo-tag-row'?row:null;
for(const input of diagInputs){
 input.closest=selector=>selector==='.komo-tag-row'?input.parentElement:null;
 Object.defineProperty(input,'value',{get(){throw Error('diagnostic must not read tag values');}});
}
const diagSheet={contains(el){return el===diagRow1||el===diagRow2||diagInputs.includes(el);}};
assert.equal(tagFieldLocation(diagInputs[0],diagSheet),'row1:left-key');
assert.equal(tagFieldLocation(diagInputs[1],diagSheet),'row1:right-value');
assert.equal(tagFieldLocation(diagInputs[2],diagSheet),'row2:left-key');
assert.equal(tagFieldLocation(diagInputs[3],diagSheet),'row2:right-value');
assert.equal(tagFieldLocation(new Node(),diagSheet),'-');

const vv=emitter({height:641,offsetTop:0});
const scrollCalls=[];
globalThis.window=emitter({
 innerHeight:641,visualViewport:vv,scrollX:0,scrollY:423,
 location:{search:''},
 matchMedia:()=>({matches:true}),
 scrollTo(x,y){scrollCalls.push([x,y]);this.scrollX=x;this.scrollY=y;}
});
globalThis.document={activeElement:null,body:new Node()};
const game=new Node(),host=new Node(),mask=new Node(),handle=new Node(),sheet=new Node();
host.closest=selector=>selector==='.landscape-game'?game:null;
mask.getBoundingClientRect=()=>({height:700,top:380-window.scrollY});
sheet.parentElement=mask;
sheet.clientHeight=488;sheet.scrollHeight=560;
handle.setPointerCapture=()=>{};handle.hasPointerCapture=()=>false;handle.releasePointerCapture=()=>{};
let dismissed=0;
const motion=attachSheetMotion(sheet,handle,()=>dismissed++);
const gameStyle=JSON.stringify(game.style),hostStyle=JSON.stringify(host.style);
const verifyUnchanged=()=>{
 assert.equal(sheet.style.height,'70%','sheet remains 70%');
 assert.equal(sheet.style.maxHeight,'70%');
 assert.equal(sheet.style.position,'relative');
 assert.equal(JSON.stringify(game.style),gameStyle);
 assert.equal(JSON.stringify(host.style),hostStyle);
 assert.equal(sheet.scrollTop,0,'JS never scrolls tag sheet');
 assert.equal(sheet.scrollHeight,560,'no extra keyboard scroll space');
 assert.equal(sheet.children.length,0,'no spacer inserted');
};
const fields=[new Node(),new Node(),new Node()];
for(const field of fields){
 field.closest=selector=>selector.startsWith('input,textarea')?field:null;
 field.focusCalls=[];
 field.focus=options=>{field.focusCalls.push(options);document.activeElement=field;sheet.emit('focusin',{target:field});};
}
sheet.contains=target=>fields.includes(target);
const keyboard=attachEditorKeyboardLayout({host,mask,sheet});
verifyUnchanged();
const pointer=(target,pointerType='touch')=>({target,pointerType});
sheet.emit('pointerdown',pointer(fields[0]));
assert.deepEqual(fields[0].focusCalls,[{preventScroll:true}],'touch focus uses preventScroll');
assert.equal(document.activeElement,fields[0]);
assert.deepEqual(scrollCalls,[],'focusing never scrolls the document');
verifyUnchanged();

vv.height=313;vv.emit('resize');
sheet.emit('beforeinput',{target:fields[0]});
sheet.emit('input',{target:fields[0]});
verifyUnchanged();
assert.equal(window.scrollY,423,'keyboard and input do not cause JS page scrolling');
assert.deepEqual(scrollCalls,[]);

// Focus moves between tag rows; neither page nor sheet gets programmatic scroll.
sheet.emit('focusout',{target:fields[0]});
sheet.emit('pointerdown',pointer(fields[1]));
assert.deepEqual(fields[1].focusCalls,[{preventScroll:true}]);
verifyUnchanged();
sheet.emit('pointerdown',pointer(fields[1]));
assert.equal(fields[1].focusCalls.length,1,'already focused input is left alone');
sheet.emit('pointerdown',pointer(fields[2],'mouse'));
assert.equal(fields[2].focusCalls.length,0,'mouse uses native focus');
verifyUnchanged();

// Simulate Safari's native page movement: keyboard dismissal must not restore it.
window.scrollY=462;vv.offsetTop=39;
document.activeElement=null;sheet.emit('focusout',{target:fields[1]});
vv.height=641;vv.offsetTop=0;vv.emit('resize');
assert.equal(window.scrollY,462,'keyboard close does not restore original page position');
assert.deepEqual(scrollCalls,[],'no page scrollTo at any time');
verifyUnchanged();

// Closing the editor with the keyboard still up also does not restore the page.
sheet.emit('pointerdown',pointer(fields[2]));
vv.height=313;vv.emit('resize');
window.scrollY=700;
keyboard.destroy();
assert.equal(sheet.listenerCount('pointerdown'),0,'focus capture is removed on destroy');
vv.height=641;vv.emit('resize');
assert.equal(window.scrollY,700,'editor destroy does not restore page position');
assert.deepEqual(scrollCalls,[]);
motion.destroy();
verifyUnchanged();
assert.equal(dismissed,0);

const newKey=new Node(),newValue=new Node();
const focusToValue=[];
newValue.focus=options=>{focusToValue.push(options);document.activeElement=newValue;};
attachNewTagKeyNext(newKey,newValue);
assert.equal(newKey.enterKeyHint,'next','new tag key offers the Next key on iPhone');
const keydown=(props={})=>{
 let prevented=false;
 newKey.emit('keydown',{key:'Enter',preventDefault(){prevented=true;},...props});
 return prevented;
};
assert.equal(keydown({key:'a'}),false,'ordinary typing does not change focus');
assert.equal(focusToValue.length,0);
newKey.emit('compositionstart');
assert.equal(keydown(),false,'Enter to confirm Japanese conversion is not intercepted');
newKey.emit('compositionend');
assert.equal(keydown({isComposing:true}),false,'native composition state is respected');
assert.equal(keydown({keyCode:229}),false,'legacy IME composition code is respected');
assert.equal(focusToValue.length,0,'conversion does not move focus');
assert.equal(keydown(),true,'completed Enter is handled');
assert.deepEqual(focusToValue,[{preventScroll:true}],'value receives focus without scrolling');
assert.equal(document.activeElement,newValue);
assert.deepEqual(scrollCalls,[],'tag key navigation never scrolls the page');

const labelsSource=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','komorebi3d','maps','map-labels.js'),'utf8');
assert.ok(labelsSource.includes('if(!k.readOnly)attachNewTagKeyNext(k,v)'),
 'only editable new tag keys get the Enter navigation');
console.log('touch preventScroll, new tag key Enter navigation, and no JS scrolling: PASS (Safari real-device unverified)');
