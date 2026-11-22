// The displayed text must be the exact tile JSON selected by index.json.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMap} from '../komorebi3d/maps/map-loader.js';
import {createMapFilenameIndicator} from '../komorebi3d/maps/map-filename-indicator.js';

class StubNode{
 constructor(){this.children=[];this.style={cssText:''};this.hidden=false;this.attrs={};this.textContent='';}
 appendChild(child){this.children.push(child);}
 setAttribute(name,value){this.attrs[name]=value;}
}
const oldDoc=globalThis.document,oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage;
try{
 globalThis.document={createElement:()=>new StubNode()};
 const panelA=new StubNode(),panelB=new StubNode();
 const indicatorA=createMapFilenameIndicator(panelA),indicatorB=createMapFilenameIndicator(panelB);
 assert.equal(panelA.children.length,1);
 assert.equal(panelB.children.length,1);
 const labelA=panelA.children[0],labelB=panelB.children[0];
 assert.equal(labelA.hidden,true,'hidden until a map is loaded');
 assert.equal(labelB.hidden,true);
 assert.ok(labelA.style.cssText.includes('bottom:6px'));
 assert.ok(labelA.style.cssText.includes('right:6px'));
 assert.ok(labelA.style.cssText.includes('pointer-events:none'),'overlay must not intercept gameplay input');

 const filenames={
  old:'tile_0_0_20261114023930.json',
  new:'tile_0_0_20261121012345.json'
 };
 const requested=[];
 const elements=[
  ...Array.from({length:10},(_,i)=>({id:String(i+1),type:'way',tags:{building:'yes'},geometry:[[0,0],[1,0],[1,1],[0,0]]})),
  ...Array.from({length:10},(_,i)=>({id:String(i+11),type:'way',tags:{highway:'residential'},geometry:[[0,0],[1,1]]})),
  {id:'50',type:'node',tags:{shop:'yes'}}
 ];
 const data=()=>({source:'OpenStreetMap contributors',elements:structuredClone(elements),tile:{id:'0_0',sizeM:2000,gridX:0,gridY:0}});
 globalThis.localStorage={length:0,key:()=>null,getItem:()=>null,setItem(){},removeItem(){}};
 globalThis.fetch=async url=>{
  requested.push(url);
  const source=url.includes('tiles-2km-geofabrik/')?'new':'old';
  if(url.endsWith('/index.json'))return {ok:true,status:200,json:async()=>({tiles:{'0_0':filenames[source]}})};
  if(url.endsWith('/'+filenames[source]))return {ok:true,status:200,json:async()=>data()};
  throw Error('Unexpected map request: '+url);
 };
 const old=await loadMap({source:'old'});
 assert.equal(old.tileFilename,filenames.old,'old map filename came from index');
 indicatorA.setFilename(old.tileFilename);
 assert.equal(labelA.textContent,filenames.old);
 assert.equal(labelA.hidden,false);
 assert.equal(labelB.hidden,true,'other screen stays empty until loaded');
 const newest=await loadMap({source:'new'});
 assert.equal(newest.tileFilename,filenames.new,'new map filename came from index');
 indicatorB.setFilename(newest.tileFilename);
 assert.equal(labelB.textContent,filenames.new);
 assert.equal(labelB.hidden,false);
 indicatorA.setFilename(newest.tileFilename);
 assert.equal(labelA.textContent,filenames.new,'switching A from old to new uses the same loaded source');
 indicatorB.setFilename(null);
 assert.equal(labelB.hidden,true,'forest / unloaded screen hides filename');
 assert.equal(labelB.textContent,'');
 assert.ok(requested.includes('./maps/data/tiles-2km/'+filenames.old));
 assert.ok(requested.includes('./maps/data/tiles-2km-geofabrik/'+filenames.new));
 const product=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','komorebi3d','dev.html'),'utf8');
 assert.ok(product.includes('tileFilename:map.tileFilename'),'loaded map name is stored with rendered Matsudo map');
 assert.ok(product.includes('matsudoMaps[source]=displayed;'+String.fromCharCode(10)+'    refreshMapFilenameIndicators();'),'labels update when map becomes available');
 assert.ok(product.includes("activeWorld=name;"+String.fromCharCode(10)+"  refreshMapFilenameIndicators();"),'forest hides the labels');
 assert.ok(product.includes("if(setting==='map')refreshMapFilenameIndicators();"),'screen map switch refreshes labels');
 assert.ok(product.includes("matsudoMaps[screenConfigs[screen].map]?.tileFilename"),'each A/B screen uses its map selection');
 console.log('Map filenames from index.json, A/B display and forest/unloaded hiding: PASS');
}finally{
 if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
 if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;
}
