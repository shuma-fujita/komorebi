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
const tolerance=TENANT_OUTSIDE_TOLERANCE_METRES;
assert.equal(select([a],poi(1,5,5))[0].outsideFootprint,undefined,'inside is unmarked');
assert.equal(select([a],poi(2,10+tolerance/2,5))[0].outsideFootprint,true,'within tolerance warning');
assert.equal(select([a],poi(3,10+tolerance,5))[0].outsideFootprint,true,'boundary warning');
assert.equal(select([a],poi(4,10+tolerance+.1,5)).length,0,'beyond tolerance rejected');
assert.equal(select([a,building(2,10+2*tolerance,22+2*tolerance)],poi(5,10+tolerance,5)).length,0,'two neighboring buildings ambiguous');
assert.equal(select([a,building(3,10.5,16)],poi(6,10.7,5)).length,0,'inside other building wins');
assert.equal(select([building(1,0,20),building(3,5,10)],poi(7,7,5)).length,0,'nested smaller building wins');
assert.equal(select([a,b],poi(8,30,5)).length,0,'distant shop rejected');
console.log('Outside tenant matching: 9 tests PASS');

