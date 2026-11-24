#!/usr/bin/env node
// Surface parking behavior: polygon eligibility, safe stall placement, batched geometry.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parkingAreaFromOsm} from '../komorebi3d/objects/parking/osm-adapter.js';
import {paintParkingArea} from '../komorebi3d/objects/parking/common.js';
import {PARKING_ASPHALT_COLOR,PARKING_LINE_COLOR,PARKING_ASPHALT_Y,PARKING_LINE_Y,PARKING_STALL_DEPTH_M,PARKING_STALL_WIDTH_M,PARKING_EDGE_INSET_M} from '../komorebi3d/objects/parking/const.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
const lat=35.78444,lon=139.90061,mLon=111320*Math.cos(lat*Math.PI/180);
const point=(x,z)=>({lon:lon+x/mLon,lat:lat-z/111320});
const footprint=[point(0,0),point(24,0),point(24,12),point(0,12),point(0,0)];
const parking={type:'way',id:901,tags:{amenity:'parking'},geometry:footprint};
const project=p=>[(p.lon-lon)*mLon,-(p.lat-lat)*111320];
const polygon=parkingAreaFromOsm(parking,parking.geometry.map(project),100);
assert.equal(polygon.points.length,4);
assert.ok(Math.abs(polygon.area-288)<.01);
for(const invalid of [
 {...parking,type:'node'}, {...parking,tags:{amenity:'bicycle_parking'}},
 {...parking,tags:{amenity:'parking',parking:'underground'}},
 {...parking,tags:{amenity:'parking',parking:'multi-storey'}},
 {...parking,geometry:footprint.slice(0,4)},
 {...parking,geometry:[point(0,0),point(1,0),point(1,1),point(0,0)]}
])assert.equal(parkingAreaFromOsm(invalid,(invalid.geometry||[]).map(project),100),null);
const fill=[],orange=[];
const fakeTop=(mesh,points,height,color)=>fill.push({points,height,color});
const fakeQuad=(mesh,a,b,c,d,color)=>orange.push({points:[a,b,c,d],color});
const count=paintParkingArea({},polygon.points,fakeTop,fakeQuad);
assert.equal(fill.length,1);
assert.equal(fill[0].color,PARKING_ASPHALT_COLOR);
assert.equal(fill[0].height,PARKING_ASPHALT_Y);
assert.ok(count>0,'Rectangular lot must have multiple complete U-shaped stalls');
assert.equal(orange.length,2*count+1,'Adjacent U shapes share their divider');
const centerLine=strip=>{
 const [a,b,c,d]=strip.points;
 return [[(a[0]+b[0])/2,(a[2]+b[2])/2],[(c[0]+d[0])/2,(c[2]+d[2])/2]];
};
let sideCount=0,backCount=0;
for(const strip of orange){
 assert.equal(strip.color,PARKING_LINE_COLOR);
 for(const vertex of strip.points)assert.equal(vertex[1],PARKING_LINE_Y);
 const [a,b]=centerLine(strip),dx=Math.abs(b[0]-a[0]),dz=Math.abs(b[1]-a[1]);
 if(Math.abs(dz-PARKING_STALL_DEPTH_M)<.01&&dx<.01)sideCount++;
 else if(Math.abs(dx-PARKING_STALL_WIDTH_M)<.01&&dz<.01){
  backCount++;
  assert.ok(Math.abs(a[1]-PARKING_EDGE_INSET_M)<.01,
   'The back stripe closes the outer boundary end');
 }else assert.fail('Unexpected parking line shape');
}
assert.equal(sideCount,count+1,'Each U has left and right side stripes');
assert.equal(backCount,count,'Each U has one back stripe');
assert.ok(!orange.some(strip=>centerLine(strip).every(p=>
 Math.abs(p[1]-(PARKING_EDGE_INSET_M+PARKING_STALL_DEPTH_M))<.01)),
 'The inward-facing stall entrance stays open');
const result=buildMap({source:'OpenStreetMap contributors',elements:[parking]},{latitude:lat,longitude:lon,halfSize:100});
assert.equal(result.counts.buildings,0);
assert.equal(result.counts.roads,0);
assert.equal(result.counts.rails,0);
assert.ok(result.meshes.length>=2,'ground and asphalt/orange mesh');
assert.ok(result.meshes.some(mesh=>mesh.colors.some((v,i)=>v===((PARKING_LINE_COLOR>>16&255)/255))),
 'orange-line geometry must reach the shared display meshes');
assert.equal(result.displayBatches.flatMap(batch=>batch.meshes).length,result.meshes.length);
// Read the current Geofabrik tile index, never hardcode a generated timestamp.
const dir=join('komorebi3d','maps','data','tiles-2km-geofabrik');
const index=JSON.parse(readFileSync(join(dir,'index.json'),'utf8'));
const live=JSON.parse(readFileSync(join(dir,index.tiles['0_0']),'utf8'));
const areas=live.elements.filter(e=>e.type==='way'&&e.tags?.amenity==='parking'&&e.geometry?.length>=4);
let rendered=0,lined=0;
for(const e of areas){
 const p=parkingAreaFromOsm(e,e.geometry.map(project),2000);
 if(!p)continue;
 rendered++;
 const n=paintParkingArea({},p.points,()=>{},(mesh,a,b,c,d)=>{
  for(const v of [a,b,c,d])assert.ok(v.every(Number.isFinite),'Parking mesh must be finite');
 });
 assert.ok(Number.isInteger(n)&&n>=0);
 lined+=n;
}
console.log('Parking PASS: footprint, road-matched asphalt, orange U-shaped stalls, exclusions, batched mesh, Geofabrik tile ('+rendered+' areas)');
