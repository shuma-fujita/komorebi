import assert from 'node:assert/strict';
import {test} from 'node:test';
import {yoshinoya} from '../objects/buildings/food/yoshinoya.js';
import {hidakaya} from '../objects/buildings/food/hidakaya.js';
import {matchFoodBuildings,resolveFoodPaint} from '../objects/buildings/food/osm-adapter.js';
import {composeFoodStorefrontSpans,paintFoodWall} from '../objects/buildings/food/common.js';
const geometry=[{lat:0,lon:0},{lat:0,lon:10},{lat:10,lon:10},{lat:10,lon:0},{lat:0,lon:0}];
const project=p=>[p.lon,p.lat];
for(const brand of [yoshinoya,hidakaya]){
 test(brand.id+' sign has complete glyphs and color bands',()=>{
  assert.ok(brand.sign.bands.length>0);
  for(const ch of brand.sign.label)assert.ok(brand.sign.glyphs[ch],ch);
 });
 test(brand.id+' matches fast food and respects level metadata',()=>{
  const building={type:'way',id:7,tags:{building:'yes','building:levels':'3'},geometry};
  const node={type:'node',id:9,tags:{amenity:'fast_food',name:brand.names[0],level:'1'},lat:5,lon:5};
  const match=matchFoodBuildings([building,node],project,100);
  assert.equal(match.get(7)?.[0]?.brand.id,brand.id);
  const spans=resolveFoodPaint(match.get(7),building.tags,9);
  assert.equal(spans.length,1);
  assert.deepEqual({bottom:spans[0].bottom,top:spans[0].top},{bottom:3,top:6});
 });
}
test('unrelated or non-food business never paints a restaurant storefront',()=>{
 const building={type:'way',id:7,tags:{building:'yes','building:levels':'3'},geometry};
 const match=matchFoodBuildings([building,{type:'node',id:9,tags:{shop:'convenience',name:'吉野家',level:'0'},lat:5,lon:5}],project,100);
 assert.equal(match.size,0);
});
test('convenience floor wins when food and convenience occupy the same span',()=>{
 const convenience={bottom:0,top:3,brand:{id:'convenience'}};
 const food={bottom:0,top:3,brand:yoshinoya};
 assert.deepEqual(composeFoodStorefrontSpans([convenience],[food]),[convenience]);
});
