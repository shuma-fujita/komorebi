import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>readFile(new URL('../maps/'+name,import.meta.url),'utf8');
const overpass=await read('map-overpass.js');
const diag=(await read('map-overpass-diagnostic.js')).replace(/^import .*;\n/m,'');
const source=overpass+'\n'+diag;
const {buildOverpassDiagnosticQuery,runOverpassDiagnostic,DIAGNOSTIC_TIMEOUT_MS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('lightweight requests stay separate from full 250m download',()=>{
 assert.equal(DIAGNOSTIC_TIMEOUT_MS,20000);
 const ping=buildOverpassDiagnosticQuery('ping');
 const buildings=buildOverpassDiagnosticQuery('buildings');
 assert.match(ping,/node\(35\.78443,139\.90060,35\.78445,139\.90062\)/);
 assert.match(ping,/out count/);
 assert.match(buildings,/way\["building"\]/);
 assert.match(buildings,/35\.783317,139\.899226,35\.785563,139\.901994/);
 assert.match(buildings,/out count/);
 assert.throws(()=>buildOverpassDiagnosticQuery('invalid'));
});
test('diagnostic reports HTTP 200, elapsed time, and feature count',async()=>{
 let calls=0;const logs=[];
 const result=await runOverpassDiagnostic('buildings',{onLog:line=>logs.push(line),fetchImpl:async(url,options)=>{
  calls++;assert.match(url,/overpass\.private\.coffee/);assert.ok(options.signal);
  return {ok:true,status:200,json:async()=>({elements:[{type:'count',tags:{total:'19'}}],osm3s:{timestamp_osm_base:'2026-11-19T00:00:00Z'}})};
 }});
 assert.equal(calls,1);assert.equal(result.count,'19');
 assert.ok(logs.some(line=>line.includes('HTTP 200')));
 assert.ok(logs.some(line=>line.includes('建物のみ 成功')));
});
test('diagnostic reports failure with one call only',async()=>{
 let calls=0,logs=[];
 await assert.rejects(runOverpassDiagnostic('ping',{onLog:line=>logs.push(line),fetchImpl:async()=>{calls++;return {ok:false,status:502};}}),/HTTP 502/);
 assert.equal(calls,1);
 assert.ok(logs.some(line=>line.includes('失敗')));
});
test('diagnostic aborts before network request',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(runOverpassDiagnostic('ping',{signal:controller.signal,fetchImpl:()=>{throw Error('unexpected fetch')}}));
});
