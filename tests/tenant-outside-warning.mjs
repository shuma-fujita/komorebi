#!/usr/bin/env node
import assert from 'node:assert/strict';
import {shopsInFocusedBuilding,TENANT_OUTSIDE_TOLERANCE_METRES} from '../komorebi3d/maps/map-occupants.js';

const building=(id,x0,x1,z0=0,z1=10)=>({
 type:'building',osmType:'way',osmId:id,
 points:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],bounds:[x0,x1,z0,z1],
 area:(x1-x0)*(z1-z0)
});
const poi=(id,x,z)=>({
 kind:'poi',osmType:'node',osmId:id,x,z,name:'shop'+id,
 tags:{shop:'convenience',level:'0'}
});
const a=building(1,0,10),b=building(2,12,22);
const select=(buildings,p)=>shopsInFocusedBuilding(buildings,[p],'way:1');
assert.equal(TENANT_OUTSIDE_TOLERANCE_METRES,1);
assert.equal(select([a],poi(1,5,5))[0].outsideFootprint,undefined,'inside is unmarked');
assert.equal(select([a],poi(2,10.5,5))[0].outsideFootprint,true,'50cm outside warning');
assert.equal(select([a],poi(3,11,5))[0].outsideFootprint,true,'1m outside warning');
assert.equal(select([a],poi(4,11.1,5)).length,0,'beyond 1m rejected');
assert.equal(select([a,b],poi(5,11,5)).length,0,'two neighboring buildings ambiguous');
assert.equal(select([a,building(3,10.5,16)],poi(6,10.7,5)).length,0,'inside other building wins');
assert.equal(select([building(1,0,20),building(3,5,10)],poi(7,7,5)).length,0,'nested smaller building wins');
assert.equal(select([a,b],poi(8,30,5)).length,0,'distant shop rejected');
console.log('Outside tenant matching: 9 tests PASS');

 // Verify the shared warning behavior, including coexistence with other notes.
import {levelFormatWarning,syncLevelFormatWarning,syncLevelTagRowWarning} from '../komorebi3d/maps/osm-level-warning.js';
import {readFileSync} from 'node:fs';
const message='⚠️ levelの書式が正しくありません。\n末尾のセミコロンは不要です。';
assert.equal(levelFormatWarning('1;2;3;'),message);
assert.equal(levelFormatWarning('1;2;3;; '),message);
assert.equal(levelFormatWarning('1;2;3'),null);
assert.equal(levelFormatWarning(undefined),null);
const row={children:[{value:'level'},{value:'1;2;3;'}],notes:[],
 querySelector(){return this.notes.find(n=>n.className==='komo-level-format-warning')||null;},
 appendChild(n){this.notes.push(n);n.remove=()=>{this.notes=this.notes.filter(x=>x!==n);};}};
globalThis.document={createElement:()=>({style:{}})};
row.notes.push({className:'komo-pending-tag-note'});
syncLevelTagRowWarning(row);syncLevelTagRowWarning(row);
assert.equal(row.notes.length,2);
assert.equal(row.notes[1].textContent,message);
row.children[1].value='1;2;3';syncLevelTagRowWarning(row);
assert.equal(row.notes.length,1);
syncLevelFormatWarning(row,'1;2;3;');
assert.equal(row.notes[1].textContent,message);
syncLevelFormatWarning(row,'0');assert.equal(row.notes.length,1);
delete globalThis.document;
const source=readFileSync(new URL('../komorebi3d/maps/map-labels.js',import.meta.url),'utf8');
assert.ok(source.includes('syncLevelTagRowWarning(row);'));
assert.ok(source.includes("row.addEventListener('input',()=>syncLevelTagRowWarning(row))"));
assert.ok(source.includes('syncLevelFormatWarning(row,shop.tags?.level);'));
const mockSource=readFileSync(new URL('../komorebi3d/mock-ui.js',import.meta.url),'utf8');
assert.ok(!mockSource.includes('syncLevelFormatWarning'));
console.log('Live tag and tenant level warnings: shared text, correction, coexistence and wiring PASS');
