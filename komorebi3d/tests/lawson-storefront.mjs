import assert from 'node:assert/strict';
import {test} from 'node:test';
import {lawson} from '../objects/buildings/convenience/lawson.js';
import {lawsonStore100} from '../objects/buildings/convenience/lawson-store100.js';
import {paintConvenienceSign,conveniencePanelLayout} from '../objects/buildings/convenience/common.js';
import {matchConvenienceBuildings,resolveConveniencePaint} from '../objects/buildings/convenience/osm-adapter.js';

const geometry=[{lat:0,lon:0},{lat:0,lon:10},{lat:10,lon:10},{lat:10,lon:0},{lat:0,lon:0}];
const project=p=>[p.lon,p.lat];
for(const brand of [lawsonStore100]){
 test(brand.id+' uses common sign renderer with complete letters, logo and entrance',()=>{
  const sign=brand.sign;
  assert.ok(sign.logo?.quads.length>0);
  assert.ok(sign.bands.length>0);
  for(const ch of sign.label)assert.ok(sign.glyphs[ch],ch);
  const rects=[],quads=[];
  assert.equal(paintConvenienceSign((...v)=>rects.push(v),(...v)=>quads.push(v),(x,y,z)=>[x,y,z],sign,{length:8,bottom:3.2,top:4,entrance:true}),true);
  assert.ok(rects.length>0);
  assert.ok(quads.length>=sign.logo.quads.length);
  assert.ok(conveniencePanelLayout(8,{entrance:true}).door);
 });
 test(brand.id+' matches a store node and paints only its declared storey',()=>{
  const node={type:'node',id:2,lat:5,lon:5,tags:{shop:'convenience',brand:brand.names[0],level:'0'}};
  const building={type:'way',id:1,geometry,tags:{building:'yes','building:levels':'3'}};
  const matched=matchConvenienceBuildings([building,node],project,100);
  assert.equal(matched.get(1)?.[0]?.brand.id,brand.id);
  assert.deepEqual(resolveConveniencePaint(matched.get(1),building.tags,9).map(x=>({bottom:x.bottom,top:x.top,id:x.brand.id})),[{bottom:0,top:3,id:brand.id}]);
 });
}
test('Lawson Store 100 is preferred to generic Lawson for its name',()=>{
 const node={type:'node',id:2,lat:5,lon:5,tags:{shop:'convenience',brand:'LAWSON',name:'LAWSON STORE 100',level:'0'}};
 const building={type:'way',id:1,geometry,tags:{building:'yes','building:levels':'2'}};
 const matched=matchConvenienceBuildings([building,node],project,100);
 assert.equal(matched.get(1)?.[0]?.brand.id,'lawson-store100');
});

test('Standard Lawson is not claimed by the legacy dedicated city storefront',()=>{
 const node={type:'node',id:20,lat:5,lon:5,tags:{shop:'convenience',brand:'ローソン',level:'0'}};
 const building={type:'way',id:1,geometry,tags:{building:'yes','building:levels':'3'}};
 assert.equal(matchConvenienceBuildings([building,node],project,100).has(1),false);
 // Old brand artwork remains available for Forest, but is not used by the city.
 assert.ok(lawson.sign?.logo);
});
