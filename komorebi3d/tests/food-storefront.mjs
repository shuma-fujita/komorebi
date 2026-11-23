import assert from 'node:assert/strict';
import {test} from 'node:test';
import {matchFoodBuildings} from '../objects/buildings/food/osm-adapter.js';
import {matchLogoBuildings,identifyLogoBrand,paintLogoBuilding} from '../objects/buildings/logos/osm-adapter.js';
import {HIDAKAYA_BG} from '../objects/buildings/food/hidakaya-sign.js';
import {YOSHINOYA_BG} from '../objects/buildings/food/yoshinoya-sign.js';
import {composeFoodStorefrontSpans} from '../objects/buildings/food/common.js';
const geometry=[{lat:0,lon:0},{lat:0,lon:10},{lat:10,lon:10},{lat:10,lon:0},{lat:0,lon:0}];
const project=p=>[p.lon,p.lat];
const polygon=[[0,0],[10,0],[10,10],[0,10]];
for(const [brandName,bg,texture] of [
 ['吉野家',YOSHINOYA_BG,'yoshinoya'],
 ['熱烈中華食堂日高屋',HIDAKAYA_BG,'hidakaya']
]){
 test(brandName+' uses shared image-logo facade instead of legacy glyphs',()=>{
  const building={type:'way',id:7,tags:{building:'yes','building:levels':'3'},geometry};
  const node={type:'node',id:9,tags:{amenity:'fast_food',name:brandName,level:'1'},lat:5,lon:5};
  assert.equal(identifyLogoBrand(node.tags)?.id,texture);
  assert.equal(matchFoodBuildings([building,node],project,100).has(7),false);
  const stores=matchLogoBuildings([building,node],project,100).get(7);
  assert.equal(stores?.[0]?.brand.id,texture);
  const quads=[],faces=[];
  assert.equal(paintLogoBuilding((...args)=>quads.push(args),{},polygon,stores,building.tags,9,3,faces,'way/7',[],0),1);
  assert.equal(faces.length,1);
  assert.equal(faces[0].texture,texture);
  assert.equal(Math.min(...faces[0].positions.filter((_,i)=>i%3===1)),3);
  assert.ok(quads.some(args=>args[4]===bg));
  const missing=matchLogoBuildings([building,{...node,tags:{name:brandName}}],project,100).get(7);
  assert.equal(paintLogoBuilding(()=>{},{},polygon,missing,building.tags,9,3,[],null,[],0),0);
 });
}
test('unrelated store does not claim legacy food facade',()=>{
 const building={type:'way',id:7,tags:{building:'yes','building:levels':'3'},geometry};
 assert.equal(matchFoodBuildings([building,{type:'node',id:9,tags:{shop:'convenience',name:'吉野家',level:'0'},lat:5,lon:5}],project,100).size,0);
});
test('convenience floor retains priority over legacy food spans',()=>{
 const convenience={bottom:0,top:3,brand:{id:'convenience'}};
 const food={bottom:0,top:3,brand:{id:'other-food'}};
 assert.deepEqual(composeFoodStorefrontSpans([convenience],[food]),[convenience]);
});
