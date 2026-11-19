import assert from 'node:assert/strict';
import {test} from 'node:test';
import {matchLoveHotelBuildings,resolveLoveHotelColor,resolveLoveHotelFloorSpans} from '../objects/buildings/love-hotel/osm-adapter.js';
import {paintLoveHotelWall} from '../objects/buildings/love-hotel/common.js';
import {LOVE_HOTEL_COLOR} from '../objects/buildings/love-hotel/const.js';

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
