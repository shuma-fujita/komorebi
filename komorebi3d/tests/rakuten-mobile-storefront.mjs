import assert from 'node:assert/strict';
import {test} from 'node:test';
import {identifyLogoBrand,matchLogoBuildings,paintLogoBuilding} from '../objects/buildings/logos/osm-adapter.js';
import {paintRakutenMobileFacade} from '../objects/buildings/logos/brands/rakuten-mobile-sign.js';

const polygon=[[0,0],[10,0],[10,8],[0,8]];
const geometry=[{lat:0,lon:0},{lat:0,lon:10},{lat:8,lon:10},{lat:8,lon:0},{lat:0,lon:0}];
const project=p=>[p.lon,p.lat];
test('Rakuten Mobile recognizes named POIs without requiring shop=mobile_phone',()=>{
 assert.equal(identifyLogoBrand({name:'楽天モバイル 松戸店'})?.id,'rakuten-mobile');
 assert.equal(identifyLogoBrand({brand:'Rakuten Mobile'})?.id,'rakuten-mobile');
 assert.equal(identifyLogoBrand({name:'楽天銀行'}),null);
});
test('Rakuten Mobile only matches explicitly leveled, unambiguous buildings',()=>{
 const building={type:'way',id:1,geometry,tags:{building:'yes','building:levels':'3'}};
 const node={type:'node',id:2,lat:4,lon:4,tags:{name:'楽天モバイル',level:'0'}};
 assert.equal(matchLogoBuildings([building,node],project,100).get(1)?.[0]?.brand.id,'rakuten-mobile');
});
test('Rakuten logo is only on entrance face directly above glazing, other walls solid pink',()=>{
 const quads=[],faces=[];
 const paint=(...args)=>quads.push(args);
 assert.equal(paintRakutenMobileFacade(paint,{},polygon,{
  bottom:0,top:6,groundGlassTop:3,entranceEdgeIndex:0,texturedFaces:faces
 }),true);
 assert.equal(faces.length,1);
 const surface=faces[0];
 assert.equal(surface.texture,'rakutenMobile');
 // Full-image UV corners only occur on the entrance face, inside the 0.6 m fascia.
 const vertices=[];
 for(let i=0;i<surface.positions.length;i+=3)vertices.push({
  x:surface.positions[i],y:surface.positions[i+1],z:surface.positions[i+2],
  u:surface.uvs[i/3*2],v:surface.uvs[i/3*2+1]
 });
 const logo=vertices.filter(v=>(v.u===0||v.u===1)&&(v.v===0||v.v===1));
 assert.equal(logo.length,6);
 assert.ok(logo.every(v=>v.y>=2.4&&v.y<=3));
 assert.ok(logo.every(v=>Math.abs(v.z)<.3));
 assert.ok(quads.some(q=>q[4]===0xe4007f));
});
test('Rakuten does not put a logo on unrelated walls without an eligible entrance',()=>{
 const faces=[];
 assert.equal(paintRakutenMobileFacade(()=>{},{},polygon,{
  bottom:0,top:3,groundGlassTop:3,entranceEdgeIndex:-1,texturedFaces:faces
 }),true);
 const uv=faces[0].uvs;
 assert.ok(uv.every((n,i)=>Math.abs(n-.04)<1e-9));
});
