#!/usr/bin/env node
import assert from 'node:assert/strict';
import {LOVE_HOTEL_COLOR} from '../komorebi3d/objects/buildings/love-hotel/const.js';
import {matchLoveHotelBuildings,resolveLoveHotelColor,resolveLoveHotelFloorSpans} from '../komorebi3d/objects/buildings/love-hotel/osm-adapter.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';

const pos=(x,z)=>({lat:-z/111320,lon:x/111320});
const way=(id,{x=0,z=0,width=12,tags={}}={})=>({
 type:'way',id,tags:{building:'yes',...tags},
 geometry:[pos(x,z),pos(x+width,z),pos(x+width,z+width),pos(x,z+width),pos(x,z)]
});
const node=(id,x,z,tags)=>({type:'node',id,...pos(x,z),tags});
const project=p=>[p.lon*111320,-p.lat*111320];
const match=elements=>matchLoveHotelBuildings(elements,project,250);
assert.equal(match([way(1,{tags:{amenity:'love_hotel'}})]).has(1),true);
assert.equal(match([way(2),node(3,5,5,{amenity:'love_hotel'})]).has(2),true);
assert.equal(match([way(2),node(3,20,20,{amenity:'love_hotel'})]).has(2),false);
assert.deepEqual([...match([way(2,{width:20}),way(3,{x:5,z:5,width:6}),node(4,6,6,{amenity:'love_hotel'})])],[3]);
assert.equal(match([way(2),node(3,5,5,{tourism:'hotel'})]).size,0);
assert.equal(resolveLoveHotelColor(2,new Set([2]),0xc9bba8),LOVE_HOTEL_COLOR);
assert.equal(resolveLoveHotelColor(3,new Set([2]),0xc9bba8),0xc9bba8);

const build=elements=>buildMap({elements},{latitude:0,longitude:0,halfSize:250});
const rgb=hex=>[(hex>>16)&255,(hex>>8)&255,hex&255];
function includesColor(map,hex){
 const target=rgb(hex);
 return map.meshes.some(mesh=>mesh.colors.some((_,i)=>i%3===0&&
  mesh.colors.slice(i,i+3).every((v,j)=>Math.round(v*255)===target[j])));
}
assert.equal(includesColor(build([way(1,{tags:{amenity:'love_hotel'}})]),LOVE_HOTEL_COLOR),true);
assert.equal(includesColor(build([way(1),node(3,5,5,{amenity:'love_hotel'})]),LOVE_HOTEL_COLOR),true);
assert.equal(includesColor(build([way(1)]),LOVE_HOTEL_COLOR),false);
assert.equal(build([way(1,{tags:{amenity:'love_hotel',height:'8'}})])
 .mapFeatures.find(f=>f.osmId===1).height,8);
console.log('Love hotel color matching: 12 tests PASS');

import {test} from 'node:test';
import {paintLoveHotelWall} from '../komorebi3d/objects/buildings/love-hotel/common.js';
{
const geometry=[{lat:0,lon:0},{lat:0,lon:10},{lat:10,lon:10},{lat:10,lon:0},{lat:0,lon:0}];
const project=p=>[p.lon,p.lat];
function scene(facility,buildingTags={building:'yes','building:levels':'6',name:'第37東京ビル'}){
 const elements=[{type:'way',id:10,tags:buildingTags,geometry},{type:'node',id:20,lat:5,lon:5,tags:facility}];
 return {matched:matchLoveHotelBuildings(elements,project,100),tags:buildingTags};
}
test('Matsudo D37: brothel level=5 tints only physical fifth floor',()=>{
 const {matched,tags}=scene({amenity:'brothel',level:'5',name:'まつど女学園'});
 assert.deepEqual(resolveLoveHotelFloorSpans(10,matched,tags,18),[{bottom:12,top:15}]);
 assert.equal(resolveLoveHotelColor(10,matched,0x123456,tags,18),0x123456);
 const emitted=[];
 paintLoveHotelWall((mesh,...args)=>emitted.push(args),{},[0,0],[10,0],resolveLoveHotelFloorSpans(10,matched,tags,18),LOVE_HOTEL_COLOR);
 assert.equal(emitted.length,1);
 assert.equal(emitted[0].at(-1),LOVE_HOTEL_COLOR);
});
test('other brothel with missing level keeps whole-building color',()=>{
 const {matched,tags}=scene({amenity:'brothel'});
 assert.equal(resolveLoveHotelColor(10,matched,0x123456,tags,18),LOVE_HOTEL_COLOR);
 assert.deepEqual(resolveLoveHotelFloorSpans(10,matched,tags,18),[]);
});
test('ordinary building does not turn pink',()=>{
 const {matched,tags}=scene({amenity:'restaurant',level:'5'});
 assert.equal(resolveLoveHotelColor(10,matched,0x123456,tags,18),0x123456);
});

}
