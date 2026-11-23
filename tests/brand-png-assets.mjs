#!/usr/bin/env node
// Lossless PNG asset regression for every former WebP storefront logo.
// The source raster is already compressed; conversion must not introduce any
// additional lossy encoding or leave a visible pink Rakuten image rectangle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

const assets={
 lawson:[144,144],
 'rakuten-mobile':[256,95],
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
 assert.equal(bytes[25],6,'RGBA PNG: '+path);
 return {bytes,width,height};
}
for(const [brand,dimensions] of Object.entries(assets)){
 const image=png('komorebi3d/assets/textures/brands/'+brand+'.png');
 assert.deepEqual([image.width,image.height],dimensions,'original pixel dimensions: '+brand);
}
// Decode Rakuten's RGBA rows to assert the image frame and the facade share
// exactly the same pink. A simple signature test would miss the previous bug.
function rgbaAt(image,positions){
 const {bytes,width,height}=image;
 let at=8,blocks=[];
 while(at<bytes.length){
  const length=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);
  if(type==='IDAT')blocks.push(bytes.subarray(at+8,at+8+length));
  at+=length+12;
  if(type==='IEND')break;
 }
 const decoded=inflateSync(Buffer.concat(blocks));
 const stride=width*4,previous=Buffer.alloc(stride),pixels=[];
 let offset=0;
 for(let y=0;y<height;y++){
  const filter=decoded[offset++],line=Buffer.alloc(stride);
  for(let i=0;i<stride;i++){
   const a=i>=4?line[i-4]:0,b=previous[i],c=i>=4?previous[i-4]:0;
   let predictor=0;
   if(filter===1)predictor=a;
   if(filter===2)predictor=b;
   if(filter===3)predictor=Math.floor((a+b)/2);
   if(filter===4){
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
    predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
   }
   assert.ok(filter<=4,'valid PNG row filter');
   line[i]=(decoded[offset++]+predictor)&255;
  }
  for(const [x,py] of positions)
   if(py===y)pixels.push({x,y,color:[...line.subarray(x*4,x*4+4)]});
  line.copy(previous);
 }
 return pixels;
}
const rakuten=png('komorebi3d/assets/textures/brands/rakuten-mobile.png');
const w=rakuten.width,h=rakuten.height;
const samples=rgbaAt(rakuten,[[0,0],[w-1,0],[0,h-1],[w-1,h-1],[0,Math.floor(h/2)],[w-1,Math.floor(h/2)],[Math.floor(w/2),0],[Math.floor(w/2),Math.floor(h/2)]]);
for(const {x,y,color} of samples){
 if(x===Math.floor(w/2)&&y===Math.floor(h/2))
  assert.ok(color[0]>225&&color[1]>220&&color[2]>220,
   'Rakuten white letters remain legible');
 else assert.deepEqual(color,[228,0,127,255],
  'Rakuten image outline matches wall magenta at '+x+','+y);
}
const moduleSource=readFileSync('komorebi3d/maps/map-facade-textures.js','utf8');
for(const brand of Object.keys(assets)){
 assert.ok(moduleSource.includes('brands/'+brand+'.png'),'PNG is loaded for '+brand);
 assert.ok(!moduleSource.includes('brands/'+brand+'.webp'),'Old WebP is not loaded for '+brand);
}
console.log('Brand PNG assets PASS: 7 lossless PNGs; Rakuten flat magenta edges and white lettering');
