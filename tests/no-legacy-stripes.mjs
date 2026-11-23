#!/usr/bin/env node
import assert from 'node:assert/strict';
import {sevenEleven} from '../komorebi3d/objects/buildings/convenience/seven-eleven.js';
import {familymart} from '../komorebi3d/objects/buildings/convenience/familymart.js';
import {ministop} from '../komorebi3d/objects/buildings/convenience/ministop.js';
import {lawson} from '../komorebi3d/objects/buildings/convenience/lawson.js';
import {lawsonStore100} from '../komorebi3d/objects/buildings/convenience/lawson-store100.js';
import {yoshinoya} from '../komorebi3d/objects/buildings/food/yoshinoya.js';
import {hidakaya} from '../komorebi3d/objects/buildings/food/hidakaya.js';
import {paintConvenienceWall} from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';
import {paintFoodWall} from '../komorebi3d/objects/buildings/food/common.js';

// Only legacy convenience storefronts retain signs. Food image brands use UV instead.
const brands=[sevenEleven,familymart,ministop,lawson,lawsonStore100];
for(const brand of [yoshinoya,hidakaya]){
 assert.equal(Object.hasOwn(brand,'sign'),false,brand.id+' must not resurrect legacy sign glyphs');
 assert.equal(Object.hasOwn(brand,'stripes'),false,brand.id+' must not resurrect stripes');
}
const a=[0,0],b=[8,0],baseColor=0xa8afb5;
for(const brand of brands){
 assert.ok(brand.sign,brand.id+' must retain its storefront sign');
 assert.equal(Object.hasOwn(brand,'stripes'),false,brand.id+' must drop the legacy wall stripes');
 const draws=[];
 paintConvenienceWall((mesh,...args)=>draws.push(args),{},a,b,4,baseColor,[{bottom:0,top:4,brand}],'front');
 assert.ok(draws.length>4,brand.id+' must retain glass, sign and door geometry');
 assert.ok(draws.some(args=>args.at(-1)===0xbcd3dd),brand.id+' must retain glazing');
}
const fallback={id:'unsupported',names:['unsupported']};
for(const paint of [paintConvenienceWall,(quad,mesh,a,b,height,color,spans)=>paintFoodWall(quad,mesh,a,b,height,color,[],spans)]){
 const draws=[];
 paint((mesh,...args)=>draws.push(args),{},a,b,4,baseColor,[{bottom:0,top:4,brand:fallback}]);
 assert.equal(draws.length,1,'Unsupported sign must leave exactly one ordinary wall');
 assert.equal(draws[0].at(-1),baseColor,'Unsupported sign must not paint stripes');
}
const partial=[];
paintConvenienceWall((mesh,...args)=>partial.push(args),{},a,b,9,baseColor,[{bottom:3,top:6,brand:fallback}]);
assert.equal(partial.length,3,'Fallback keeps untouched floors and plain occupied wall');
assert.ok(partial.every(args=>args.at(-1)===baseColor));
console.log('Legacy stripe removal PASS: 5 convenience signs, 2 retired food signs, plain-wall fallback');
