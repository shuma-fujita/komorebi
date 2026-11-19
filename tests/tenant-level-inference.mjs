#!/usr/bin/env node
import assert from 'node:assert/strict';
import {inferBuildingLevelsFromTenants} from '../komorebi3d/maps/map-tenant-levels.js';
import {resolveConveniencePaint} from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';

const point=(x,z)=>({lat:-z/111320,lon:x/111320});
const building=(id,tags={},x=0,z=0,width=12)=>({
 type:'way',id,tags:{building:'yes',...tags},
 geometry:[point(x,z),point(x+width,z),point(x+width,z+width),point(x,z+width),point(x,z)]
});
const tenant=(x,z,level,tags={})=>({type:'node',id:Math.floor(x*1000+z*100),
 ...point(x,z),tags:{shop:'massage',level,...tags}});
const project=p=>[p.lon*111320,-p.lat*111320];
const wayId=72570799;
const fam=tenant(3,3,'0',{shop:'convenience',name:'ファミリーマート'});
const goo=tenant(5,5,'1',{shop:'massage',name:'グーイット'});
const data=[building(wayId),fam,goo];
assert.equal(inferBuildingLevelsFromTenants(data,project,250).get(wayId),2);
assert.equal(inferBuildingLevelsFromTenants([building(1),tenant(3,3,'2')],project,250).get(1),3);
assert.equal(inferBuildingLevelsFromTenants([building(1),tenant(30,30,'3')],project,250).has(1),false);
assert.equal(inferBuildingLevelsFromTenants([building(1),tenant(3,3,'B1')],project,250).has(1),false);
const nested=inferBuildingLevelsFromTenants([building(1,{},0,0,20),building(2,{},5,5,6),tenant(6,6,'1')],project,250);
assert.equal(nested.has(1),false);
assert.equal(nested.get(2),2);

const family={id:'familymart',sign:null,stripes:[]};
const paint=(tags,height,inferred)=>resolveConveniencePaint([{brand:family,level:'0'}],tags,height,inferred)
 .map(s=>[s.bottom,s.top]);
assert.deepEqual(paint({},8,2),[[0,4]]);
assert.deepEqual(paint({height:'8','building:levels':'2'},8,null),[[0,4]]);
assert.deepEqual(paint({},4,null),[[0,4]]);

const run=(tags)=>buildMap({elements:[building(wayId,tags),fam,goo]},
 {latitude:0,longitude:0,halfSize:250});
assert.equal(run({}).mapFeatures.find(f=>f.osmId===wayId).height,8);
assert.equal(run({height:'9'}).mapFeatures.find(f=>f.osmId===wayId).height,9);
assert.equal(run({'building:levels':'2'}).mapFeatures.find(f=>f.osmId===wayId).height,6);
console.log('Tenant level inference: 12 tests PASS');
