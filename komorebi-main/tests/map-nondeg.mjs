#!/usr/bin/env node
// Step 4-A non-regression capture: run this same deterministic probe against
// a pinned Step 3 checkout and the candidate checkout. No copied map builder.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw Error('Required: '+name);return args[i+1];};
const builderRoot=resolve(option('--builder-root'));
const dataRoot=resolve(option('--data-root'));
const output=resolve(option('--output'));
const {createMapBuildSteps}=await import(pathToFileURL(join(builderRoot,'komorebi3d/maps/map-builder.js')).href);
const index=JSON.parse(readFileSync(join(dataRoot,'komorebi3d/maps/data/tiles-2km/index.json'),'utf8'));
const tileId='-6_-4',filename=index.tiles?.[tileId];
assert.match(filename??'',/^tile_-6_-4_\d{14}\.json$/);

const cases=[
 {id:'matsudo-500m',file:'matsudo.json',halfSize:250},
 {id:'ueno-2km',file:'tiles-2km/'+filename,halfSize:1000,tileId}
];
const mapDir=join(dataRoot,'komorebi3d/maps/data');
const hash=()=>createHash('sha256');
const digestJson=value=>hash().update(JSON.stringify(value)).digest('hex');
function digestMeshes(meshes){
 const h=hash(),buf=Buffer.allocUnsafe(8);
 h.update('mesh-v1:'+meshes.length+';');
 for(const mesh of meshes){
  for(const key of ['positions','normals','colors']){
   const values=mesh[key];
   h.update(key+':'+values.length+';');
   for(const value of values){
    if(!Number.isFinite(value))throw Error('Non-finite '+key);
    buf.writeDoubleLE(value,0);h.update(buf);
   }
  }
 }
 return h.digest('hex');
}
function inspect(result,events,featureTotal,caseId,elementCount){
 assert.equal(featureTotal,elementCount,caseId+' incomplete feature stream');
 assert.equal(result.counts.buildings>10,true,caseId+' no buildings');
 assert.equal(result.counts.roads>10,true,caseId+' no roads');
 assert.equal(result.displayBatches.length,events.filter(e=>e.type==='batch'&&e.kept).length,caseId+' batch count');
 return {
  id:caseId,elementCount,counts:result.counts,
  final:{meshes:result.meshes.length,labels:result.labels.length,mapFeatures:result.mapFeatures.length,
   meshesSha256:digestMeshes(result.meshes),
   labelsSha256:digestJson(result.labels),
   mapFeaturesSha256:digestJson(result.mapFeatures)},
  // Include batch assignment/order and yield schedule, not just end totals.
  events,
  batches:result.displayBatches.map(batch=>({
   start:batch.start,end:batch.end,meshes:batch.meshes.length,
   labels:batch.labels.length,mapFeatures:batch.mapFeatures.length,
   meshesSha256:digestMeshes(batch.meshes),
   labelsSha256:digestJson(batch.labels),
   mapFeaturesSha256:digestJson(batch.mapFeatures)
  }))
 };
}
const results=[];
for(const test of cases){
 const map=JSON.parse(readFileSync(join(mapDir,test.file),'utf8'));
 assert.equal(map.source,'OpenStreetMap contributors');
 assert.ok(Array.isArray(map.elements)&&map.elements.length>100);
 if(test.tileId){assert.equal(map.tile?.id,test.tileId);assert.equal(map.tile?.sizeM,2000);}
 const generator=createMapBuildSteps(map,{
  halfSize:test.halfSize,priorityX:-42,priorityZ:28,timeBatched:true
 });
 const events=[];let processed=0,featureTotal=0,previous=0;
 let next=generator.next(),yieldedBatches=0;
 while(!next.done){
  const item=next.value;
  if(item.type==='feature'){
   assert.equal(item.processed,previous+1,'feature progress must be consecutive');
   previous=item.processed;featureTotal++;
   // This deterministic 32-feature cadence stands in for variable 6ms
   // device-time slices; the browser's time budget is tested on device.
   next=generator.next(item.processed%32===0);
  }else if(item.type==='batch'){
   const {batch}=item;
   const kept=batch.meshes.length>0||batch.labels.length>0||batch.mapFeatures.length>0;
   events.push({type:'batch',processed:item.processed,start:batch.start,end:batch.end,
    meshes:batch.meshes.length,labels:batch.labels.length,mapFeatures:batch.mapFeatures.length,kept});
   yieldedBatches++;processed=item.processed;
   next=generator.next();
  }else throw Error('Unexpected step type: '+String(item.type));
 }
 const summary=inspect(next.value,events,featureTotal,test.id,map.elements.length);
 results.push(summary);
 process.stdout.write(test.id+': '+summary.elementCount+' OSM items, '+summary.final.meshes+' meshes, '+
  summary.final.labels+' labels, '+yieldedBatches+' batch yields\n');
}
const capture={schema:'komorebi-step4a-nondeg-v1',tileId,options:{priorityX:-42,priorityZ:28,timeBatched:true,flushEveryFeatures:32},results};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(capture,null,2)+'\n');
console.log('Captured '+output);
