import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Import as an ES module even when the repo has no package.json type=module.
const source=await readFile(new URL('../maps/map-overpass.js',import.meta.url),'utf8');
const {buildMatsudoOverpassQuery,normalizeMatsudoOverpass,fetchLiveMatsudoMap,OVERPASS_ENDPOINTS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('queries the exact Matsudo 500m bbox with geometry',()=>{
 const query=buildMatsudoOverpassQuery();
 assert.match(query,/35\.782194,139\.897842,35\.786686,139\.903378/);
 assert.match(query,/out body geom/);
 for(const key of ['shop','amenity','building','highway','railway'])assert.ok(query.includes(key));
});
const sample={osm3s:{timestamp_osm_base:'2026-11-19T00:00:00Z'},elements:[
 {type:'node',id:1,lat:35.784,lon:139.900,tags:{shop:'convenience'},version:5},
 {type:'node',id:2,lat:35.784,lon:139.900,tags:{note:'unrelated'}},
 {type:'way',id:3,version:4,tags:{building:'yes'},geometry:[{lat:35.784,lon:139.900},{lat:35.785,lon:139.900},{lat:35.785,lon:139.901},{lat:35.784,lon:139.900}]},
 {type:'way',id:4,tags:{highway:'residential'},geometry:[{lat:35.784,lon:139.900},{lat:35.784,lon:139.901}]},
 {type:'relation',id:5,tags:{shop:'mall'},members:[{type:'way',ref:3,role:'outer'}]}
]};
test('converts nodes ways and relations to existing Komorebi map structure',()=>{
 const map=normalizeMatsudoOverpass(sample);
 assert.equal(map.source,'OpenStreetMap contributors');
 assert.equal(map.osmTimestamp,'2026-11-19T00:00:00Z');
 assert.deepEqual(map.elements.map(x=>[x.type,x.id]),[['node',1],['way',3],['way',4],['relation',5]]);
 assert.equal(map.elements[1].geometry.length,4);
 assert.equal(map.elements[3].members[0].role,'outer');
});
test('rejects Overpass remarks instead of treating them as empty maps',()=>{
 assert.throws(()=>normalizeMatsudoOverpass({elements:[],remark:'runtime error'}),/Overpass/);
});
test('records fetch timing and uses normalized format',async()=>{
 const log=[];
 const many={
  ...sample,
  elements:[
   ...sample.elements,
   ...Array.from({length:12},(_,i)=>({...sample.elements[2],id:300+i})),
   ...Array.from({length:12},(_,i)=>({...sample.elements[3],id:400+i}))
  ]
 };
 const result=await fetchLiveMatsudoMap({
  onLog:line=>log.push(line),fetchImpl:async(url,options)=>{
   assert.match(url,/overpass\.private\.coffee/);
   assert.ok(options.signal);
   return {ok:true,status:200,json:async()=>many};
  }
 });
 assert.equal(result.elements.length,28);
 assert.ok(log.some(line=>line.includes('取得・変換')));
});
test('tries private.coffee before overpass-api.de and recovers from HTTP 502',async()=>{
 assert.match(OVERPASS_ENDPOINTS[0],/private\.coffee/);
 assert.match(OVERPASS_ENDPOINTS[1],/overpass-api\.de/);
 const attempts=[],log=[];
 const ready={
  ...sample,
  elements:[
   ...sample.elements,
   ...Array.from({length:12},(_,i)=>({...sample.elements[2],id:300+i})),
   ...Array.from({length:12},(_,i)=>({...sample.elements[3],id:400+i}))
  ]
 };
 const result=await fetchLiveMatsudoMap({onLog:v=>log.push(v),fetchImpl:async(url)=>{
  attempts.push(url);
  return attempts.length===1?{ok:false,status:502}:{ok:true,status:200,json:async()=>ready};
 }});
 assert.equal(attempts.length,2);
 assert.match(attempts[0],/private\.coffee/);
 assert.match(attempts[1],/overpass-api\.de/);
 assert.equal(result.elements.length,28);
 assert.ok(log.some(x=>x.includes('HTTP 502')));
 assert.ok(log.some(x=>x.includes('取得・変換')));
});
test('fails after both endpoints fail without unbounded retry',async()=>{
 let calls=0;
 await assert.rejects(fetchLiveMatsudoMap({fetchImpl:async()=>{calls++;return {ok:false,status:503};}}),/Overpass全接続先失敗/);
 assert.equal(calls,2);
});
test('honors canceled worlds before sending requests',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(fetchLiveMatsudoMap({signal:controller.signal,fetchImpl:()=>{throw Error('must not fetch')}}));
});
