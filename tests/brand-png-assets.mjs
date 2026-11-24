import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('komorebi3d/maps/map-facade-textures.js','utf8');
const names=[...source.matchAll(/brands\/([^'/?]+\.png)/g)].map(m=>m[1]);
assert.ok(names.length>0);
for(const name of new Set(names)){
 const bytes=readFileSync('komorebi3d/assets/textures/brands/'+name);
 assert.ok(bytes.length>=24);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name);
 assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0,name);
}
console.log('Registered PNG assets PASS');
