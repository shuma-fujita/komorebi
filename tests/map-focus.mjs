#!/usr/bin/env node
import assert from 'node:assert/strict';
import {pickFocusedBuilding,pickBuildingAtScreen} from '../komorebi3d/maps/map-focus.js';

const building=(id,x,z,height=12)=>({
 type:'building',osmType:'way',osmId:id,height,
 points:[[x,z],[x+8,z],[x+8,z+8],[x,z+8]],
 bounds:[x,x+8,z,z+8]
});
const focus=(buildings,eye,target)=>pickFocusedBuilding(buildings,{eye,target})?.osmId??null;
assert.equal(focus([building(1,-4,10)],[0,5,0],[0,5,20]),1,'wall hit');
assert.equal(focus([building(2,-4,10)],[0,30,0],[0,0,20]),2,'roof hit');
assert.equal(focus([building(3,-4,10),building(4,-4,30)],[0,5,0],[0,5,40]),3,'frontmost wins');
assert.equal(focus([building(5,100,10)],[0,5,0],[0,5,20]),null,'no focus outside center ray');
assert.equal(focus([building(6,10,-4)],[0,5,0],[20,5,0]),6,'side wall');
assert.equal(focus([building(7,-4,10)],[0,25,0],[0,25,30]),null,'above low roof');
assert.equal(focus([building(8,-4,210)],[0,5,0],[0,5,30]),null,'beyond 200m');
const nameless=building(9,-4,10); // Geometry selection is independent of naming.
assert.equal(focus([nameless],[0,5,0],[0,5,20]),9,'unnamed buildings still occlude');
const tapCamera={eye:[0,5,0],target:[0,5,20],fovDegrees:45};
const nearSide=building(10,-11,10),farCenter=building(11,-4,25);
const screenTap=(buildings,x,y)=>pickBuildingAtScreen(buildings,tapCamera,x,y,400,400)?.osmId??null;
assert.equal(screenTap([nearSide,farCenter],200,200),11,'screen-center tap agrees with camera focus');
assert.equal(screenTap([nearSide,farCenter],340,200),10,'off-center tap selects another building');
assert.equal(screenTap([farCenter,nearSide],340,200),10,'nearest tap building independent of input order');
assert.equal(screenTap([nearSide,farCenter],200,0),null,'sky/background tap selects nothing');
assert.equal(screenTap([nearSide,farCenter],-3,200),null,'outside viewport ignored');
assert.equal(screenTap([nearSide,farCenter],340,200),10,'screen tap is deterministic');
console.log('Camera focus geometry: 8 tests PASS; screen tap geometry: 6 tests PASS');
