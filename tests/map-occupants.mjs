#!/usr/bin/env node
import assert from 'node:assert/strict';
import {pointInFootprint,shopsInFocusedBuilding} from '../komorebi3d/maps/map-occupants.js';
const building=(id,x,z,size)=>({
 type:'building',osmType:'way',osmId:id,area:size*size,
 points:[[x,z],[x+size,z],[x+size,z+size],[x,z+size]],
 bounds:[x,x+size,z,z+size]
});
const poi=(id,x,z,level)=>({kind:'poi',osmType:'node',osmId:id,x,z,name:'施設'+id,tags:{shop:'yes',...(level===null?{}:{level:String(level)})}});
const outer=building(1,0,0,20),inner=building(2,4,4,4),other=building(3,40,40,15);
const labels=[poi(1,10,10,5),poi(2,2,2,1),poi(3,6,6,2),poi(4,30,30,1),poi(5,10,10,null)];
assert.equal(pointInFootprint(10,10,outer.points),true);
assert.equal(pointInFootprint(30,30,outer.points),false);
assert.equal(pointInFootprint(0,5,outer.points),true,'boundary counted as inside');
assert.deepEqual(shopsInFocusedBuilding([outer,inner,other],labels,'way:1').map(v=>v.osmId),[1,2,5],
 'all outer stores sorted by descending level, inner/other excluded');
assert.deepEqual(shopsInFocusedBuilding([outer,inner,other],labels,'way:2').map(v=>v.osmId),[3]);
assert.deepEqual(shopsInFocusedBuilding([outer,inner,other],labels,'way:3'),[]);
assert.deepEqual(shopsInFocusedBuilding([outer,inner,other],labels,'way:999'),[]);
console.log('OSM building/POI association: 7 assertions PASS');
