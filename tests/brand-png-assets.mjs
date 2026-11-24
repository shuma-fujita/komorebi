#!/usr/bin/env node
// Lossless PNG asset regression for every former WebP storefront logo.
// The source raster is already compressed; conversion must not introduce any
// additional lossy encoding or leave a visible pink Rakuten image rectangle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

const assets={
 doutor:[692,193],
 daikokuya:[775,228],
 welcia:[1448,510],
 lawson:[144,144],
 'rakuten-mobile':[720,253],
 yoshinoya:[256,127],
 hidakaya:[256,56],
 'tonkatsu-tonichi':[192,224],
 isomaru:[192,128],
 hoshino:[288,192]
};
const signature=Buffer.from('89504e470d0a1a0a','hex');
function png(path){
 const bytes=readFileSync(path);
 assert.deepEqual(bytes.subarray(0,8),signature,path+' is a PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.equal(bytes[24],8,'8-bit RGB channels: '+path);
 assert.ok([2,3,6].includes(bytes[25]),'RGB, indexed or RGBA PNG: '+path);
 return {bytes,width,height};
}
for(const [brand,dimensions] of Object.entries(assets)){
 const image=png('komorebi3d/assets/textures/brands/'+brand+'.png');
 assert.deepEqual([image.width,image.height],dimensions,'original pixel dimensions: '+brand);
}
// The supplied PNG has been cropped to enlarge the letters and optimized
// as indexed PNG. Check the actual color palette and edges, not a previous
// postprocessed RGBA replacement image.
const rakuten=png('komorebi3d/assets/textures/brands/rakuten-mobile.png');
assert.equal(rakuten.bytes[25],3,'Rakuten cropped PNG is indexed');
let at=8,palette=null;const blocks=[];
while(at<rakuten.bytes.length){
 const len=rakuten.bytes.readUInt32BE(at);
 const kind=rakuten.bytes.toString('ascii',at+4,at+8);
 if(kind==='PLTE')palette=rakuten.bytes.subarray(at+8,at+8+len);
 if(kind==='IDAT')blocks.push(rakuten.bytes.subarray(at+8,at+8+len));
 at+=len+12;
 if(kind==='IEND')break;
}
assert.ok(palette&&blocks.length);
const decompressed=inflateSync(Buffer.concat(blocks));
const w=rakuten.width,h=rakuten.height;
let pos=0,whiteCount=0;
let previous=Buffer.alloc(w);
const perimeter=[];
for(let y=0;y<h;y++){
 const filter=decompressed[pos++],line=Buffer.alloc(w);
 assert.ok(filter>=0&&filter<=4,'valid indexed-PNG filter');
 for(let x=0;x<w;x++){
  const a=x?line[x-1]:0,b=previous[x],c=x?previous[x-1]:0;
  const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
  const predictor=filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):
   filter===4?(pa<=pb&&pa<=pc?a:pb<=pc?b:c):0;
  line[x]=(decompressed[pos++]+predictor)&255;
  const off=line[x]*3;
  const rgb=[palette[off],palette[off+1],palette[off+2]];
  if(x>w*.1&&x<w*.9&&y>h*.15&&y<h*.85&&rgb.every(n=>n>245))
   whiteCount++;
  if((x===0||x===w-1||x===Math.floor(w/2))&&
     (y===0||y===h-1||y===Math.floor(h/2))&&
     (x===0||x===w-1||y===0||y===h-1))
   perimeter.push(rgb);
 }
 previous=line;
}
assert.ok(whiteCount>1000,'Cropped image keeps the white Rakuten letters');
assert.ok(perimeter.length>=6);
for(const color of perimeter)
 assert.deepEqual(color,[232,2,136],
  'PNG image perimeter matches common facade background #E80288');

const moduleSource=readFileSync('komorebi3d/maps/map-facade-textures.js','utf8');
for(const brand of Object.keys(assets)){
 assert.ok(moduleSource.includes('brands/'+brand+'.png'),'PNG is loaded for '+brand);
 assert.ok(!moduleSource.includes('brands/'+brand+'.webp'),'Old WebP is not loaded for '+brand);
}
console.log('Brand PNG assets PASS: 10 PNG assets; Rakuten cropped PNG retains clear white wordmark');
