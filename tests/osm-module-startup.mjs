import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Load the real module graph with native ESM, including its static imports.
// No browser storage, Client ID or network is required for unauthenticated startup.
const devUrl=new URL('../komorebi3d/dev.html',import.meta.url);
const dev=await readFile(devUrl,'utf8');
const labelsImport=dev.match(/import\s+\{createMapLabels\}\s+from\s+"([^"]+)"/);
assert.ok(labelsImport,'game map-labels import');
const labelsUrl=new URL(labelsImport[1],devUrl);
const labels=await readFile(labelsUrl,'utf8');
const osmImport=labels.match(/import\s+\{([^}]+)\}\s+from\s+'([^']*osm-test-api\.js[^']*)'/);
assert.ok(osmImport,'map-labels OSM import');
globalThis.location=new URL('https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html');
const storage=new Map();
Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{
 getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)
}});
globalThis.fetch=async()=>{throw Error('Unexpected network request during unauthenticated startup');};
const osm=await import(new URL(osmImport[2],labelsUrl));
for(const name of osmImport[1].split(',').map(s=>s.trim())){
 assert.ok(Object.hasOwn(osm,name),'missing export '+name);
}
await osm.finishOsmTestLogin();
assert.equal(osm.hasOsmTestToken(),false);
assert.equal(osm.consumeOsmTestAuthError(),'');
assert.equal(storage.size,0);
console.log('OSM native module startup PASS');
