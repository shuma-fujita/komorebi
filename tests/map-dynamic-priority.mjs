#!/usr/bin/env node
// Step 4-B behavioral checks, independent from the frozen Step 3 no-movement
// byte-for-byte comparison in tests/map-nondeg.mjs.
import assert from 'node:assert/strict';
import {shopsInFocusedBuilding} from '../komorebi3d/maps/map-occupants.js';
import {createMapBuildSteps} from '../komorebi3d/maps/map-builder.js';

const lat0=35.78444,lon0=139.90061,metersPerLon=111320*Math.cos(lat0*Math.PI/180);
const point=(x,z)=>({lon:lon0+x/metersPerLon,lat:lat0-z/111320});
const elements=[];
for(let i=0;i<16;i++){
 const x=(i+1)*25,z=0;
 elements.push({type:'way',id:10000+i,tags:{building:'yes',name:'Building '+i},geometry:[
  point(x-5,z-5),point(x+5,z-5),point(x+5,z+5),point(x-5,z+5),point(x-5,z-5)
 ]});
 elements.push({type:'way',id:20000+i,tags:{highway:'residential'},geometry:[
  point(x-5,40),point(x+5,40)
 ]});
}
// Same-name building and distinct same-name POIs retain independent identities.
elements.push({type:'node',id:30001,lat:point(150,0).lat,lon:point(150,0).lon,tags:{shop:'convenience',name:'Building 5'}});
elements.push({type:'node',id:30002,lat:point(425,20).lat,lon:point(425,20).lon,tags:{amenity:'cafe',name:'Standalone POI'}});
elements.push({...elements.at(-2),id:30003,tags:{shop:'convenience',name:'Building 5',level:'1'}});
elements.push({...elements.at(-3),tags:{shop:'convenience',name:'Duplicate ID',level:'9'}});
const map={source:'OpenStreetMap contributors',elements};

function run(positions){
 const gen=createMapBuildSteps(map,{latitude:lat0,longitude:lon0,halfSize:500,priorityX:0,priorityZ:0,timeBatched:true});
 const eventPhases=[],batches=[],progress=[],published=[],features=[];
 let sawBothBeforeDone=false;
 let focus=positions.default??[0,0];
 let result=gen.next();
 while(!result.done){
  const item=result.value;
  if(item.type==='feature'){
   progress.push(item.processed);
   focus=positions[item.processed]??focus;
   result=gen.next({flush:true,playerX:focus[0],playerZ:focus[1]});
  }else if(item.type==='batch'){
   batches.push(item.batch);
   published.push(...item.batch.labels);features.push(...item.batch.mapFeatures);
   const shops=shopsInFocusedBuilding(features,published,'way:10005');
   if(item.processed<elements.length&&shops.some(x=>x.osmId===30001)&&shops.some(x=>x.osmId===30003))sawBothBeforeDone=true;
   result=gen.next();
  }else if(item.type==='priority'){
   eventPhases.push(item.phase);
   result=gen.next();
  }else throw Error('Unexpected event '+item.type);
 }
 assert.deepEqual(progress,Array.from({length:elements.length},(_,i)=>i+1));
 assert.equal(result.value.counts.buildings,16);
 assert.equal(result.value.counts.roads,16);
 assert.equal(result.value.counts.rails,0);
 assert.equal(result.value.mapFeatures.length,32);
 assert.equal(result.value.labels.length,19); // 16 buildings + three distinct POIs
 assert.equal(published.filter(x=>x.kind==='poi'&&x.osmId===30001).length,1);
 assert.equal(published.find(x=>x.kind==='poi'&&x.osmId===30001).name,'Building 5');
 assert.equal(published.filter(x=>x.kind==='poi').length,3);
 if(!positions[1])assert.ok(sawBothBeforeDone,'same-name tenants must appear before map completion');
 const final=result.value;
 assert.equal(final.displayBatches.reduce((count,b)=>count+b.mapFeatures.length,0),final.mapFeatures.length);
 assert.equal(final.displayBatches.reduce((count,b)=>count+b.labels.length,0),final.labels.length);
 assert.deepEqual(new Set(final.displayBatches.flatMap(b=>b.mapFeatures)).size,final.mapFeatures.length);
 assert.deepEqual(new Set(final.displayBatches.flatMap(b=>b.labels)).size,final.labels.length);
 return {final,batches,eventPhases};
}

const stable=run({default:[0,0]});
const underThreshold=run({1:[49,0],default:[0,0]});
assert.deepEqual(underThreshold.eventPhases,[],'49m must NOT reprioritize');
assert.deepEqual(underThreshold.batches.map(b=>b.start),stable.batches.map(b=>b.start));
assert.deepEqual(underThreshold.batches.flatMap(b=>b.labels.map(l=>l.name)),
 stable.batches.flatMap(b=>b.labels.map(l=>l.name)));

const onThreshold=run({1:[50,0]});
assert.equal(onThreshold.eventPhases.filter(phase=>phase==='done').length,1,
 'exactly 50m must trigger one reprioritization');

const moved=run({1:[400,0],default:[400,0]});
assert.ok(moved.eventPhases.includes('done'),'400m movement must reprioritize');
const earlyLabels=moved.batches.slice(1,4).flatMap(b=>b.labels.map(l=>l.name));
assert.ok(earlyLabels.includes('Building 15'),'unbuilt far building should move to front');
assert.ok(!stable.batches.slice(1,4).flatMap(b=>b.labels.map(l=>l.name)).includes('Building 15'),
 'initial static order must not already contain far building');

const returned=run({1:[400,0],10:[0,0],default:[0,0]});
assert.equal(returned.eventPhases.filter(phase=>phase==='done').length,2,
 'moving back another 50m must reorder again');
for(const actual of [underThreshold,onThreshold,moved,returned]){
 assert.deepEqual(actual.final.counts,stable.final.counts);
 assert.deepEqual(actual.final.labels,stable.final.labels,'final identity-preserved labels must be invariant');
 assert.deepEqual(actual.final.mapFeatures,stable.final.mapFeatures,'final minimap features must be invariant');
}
console.log('Step 4-B PASS: 49m no-op, 50m+ reordering, two moves, no duplicate or missing geometry/labels');
