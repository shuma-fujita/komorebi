// Verify changeset attribution without API calls or browser access.
import assert from 'node:assert/strict';
import {OSM_CHANGESET_CREATED_BY,buildOsmChangesetTags} from '../komorebi3d/maps/osm-changeset-tags.js';
import {makeChangesetXml,OSM_TEST_ORIGIN,sendOsmTestTags,createOsmTestCopy} from '../komorebi3d/maps/osm-test-api.js';

import {createOsmApi} from '../komorebi3d/maps/osm-api.js?v=step1e-20261126';
import {OSM_PRODUCTION} from '../komorebi3d/maps/osm-environments.js?v=step1a-20261126';

assert.equal(OSM_CHANGESET_CREATED_BY,'Komorebi Builder');
assert.deepEqual(buildOsmChangesetTags('Add level: 2'),{
 created_by:'Komorebi Builder',comment:'Add level: 2'
});
assert.deepEqual(buildOsmChangesetTags('Add level: 2','  '),{
 created_by:'Komorebi Builder',comment:'Add level: 2'
},'Blank source is omitted');
assert.deepEqual(buildOsmChangesetTags('Add level: 2','survey'),{
 created_by:'Komorebi Builder',comment:'Add level: 2',source:'survey'
});
assert.equal(buildOsmChangesetTags('Add level: 2','  local knowledge  ').source,'local knowledge');
assert.equal(buildOsmChangesetTags('Add level: 2','  original map  ').source,'original map');
assert.equal(OSM_TEST_ORIGIN,'https://master.apis.dev.openstreetmap.org',
 'Existing test-server destination is unchanged');

// Minimal DOM stub for offline serialization of the actual changeset builder.
class XmlNode{
 constructor(name){this.name=name;this.tagName=name;this.attrs=new Map();this.children=[];}
 setAttribute(key,value){this.attrs.set(key,String(value));}
 appendChild(node){this.children.push(node);}
 getAttribute(key){return this.attrs.get(key)??null;}
}
const savedGlobals=Object.fromEntries(['document','XMLSerializer','DOMParser','sessionStorage','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
try{
 globalThis.document={implementation:{createDocument(_namespace,rootName){
  return {documentElement:new XmlNode(rootName),createElement:name=>new XmlNode(name),importNode:node=>node};
 }}};
 globalThis.XMLSerializer=class{
  serializeToString(document){
   const render=node=>{
    const attrs=[...node.attrs].map(([key,value])=>' '+key+'="'+value+'"').join('');
    return '<'+node.name+attrs+'>'+node.children.map(render).join('')+'</'+node.name+'>';
   };
   return render(document.documentElement);
  }
 };
 const xml=makeChangesetXml('Add level: 2');
 assert.match(xml,/<changeset>/);
 assert.equal(xml.includes('k="source"'),false,'Unspecified source must not appear');
 const surveyXml=makeChangesetXml('Add level: 2','survey');
 assert.ok(surveyXml.includes('<tag k="source" v="survey"></tag>'));
 assert.ok(surveyXml.includes('<tag k="comment" v="Add level: 2"></tag>'),
  'Selecting source does not change the comment');
 assert.ok(surveyXml.includes('<tag k="created_by" v="Komorebi Builder"></tag>'));
 const localXml=makeChangesetXml('Add level: 2','local knowledge');
 assert.ok(localXml.includes('<tag k="source" v="local knowledge"></tag>'));
 const customXml=makeChangesetXml('Add level: 2','  aerial photo  ');
 assert.ok(customXml.includes('<tag k="source" v="aerial photo"></tag>'));
 assert.equal(makeChangesetXml('Add level: 2','  ').includes('k="source"'),false);
 const copyXml=makeChangesetXml('Copy existing OSM feature for testing (development server only)');
 assert.equal(copyXml.includes('k="source"'),false,
  'Existing test copy flow remains unchanged');
 assert.ok(xml.includes('<tag k="created_by" v="Komorebi Builder"></tag>'));
 assert.ok(xml.includes('<tag k="comment" v="Add level: 2"></tag>'));
 assert.doesNotMatch(xml,/Komorebi 3D test editor/);
 assert.equal((xml.match(/k="created_by"/g)||[]).length,1);
 // Exercise the actual TEST writers with offline HTTP and DOM substitutes.
 // No requests can reach either OSM server.
 const calls=[];
 let failUpdate=false,failClose=false,disconnect=false,failCreate=false;
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>key==='komorebi:osm-test:token'?'offline-token':null}});
 globalThis.fetch=async(url,options)=>{
  calls.push({url,...options});
  const path=new URL(url).pathname;
  assert.equal(new URL(url).origin,OSM_TEST_ORIGIN,'Write destination must be TEST');
  assert.equal(options.headers.Authorization,'Bearer offline-token');
  if(path.endsWith('/create'))return {ok:!failCreate,status:503,text:async()=>failCreate?'unavailable':'42'};
  if(path.endsWith('/close'))return {ok:!failClose,status:500,text:async()=>''};
  if(path.endsWith('/upload'))return {ok:true,text:async()=>'<diffResult/>'};
  if(/\/(node|way|relation)\/123$/.test(path)){
   if(disconnect)throw new TypeError('network disconnected');
   return {ok:!failUpdate,status:409,text:async()=>failUpdate?'version conflict':'8'};
  }
  throw Error('Unexpected mocked request: '+path);
 };
 globalThis.DOMParser=class{
  parseFromString(xml){
   assert.equal(xml,'<diffResult/>');
   return {querySelector:()=>null,documentElement:{tagName:'diffResult',children:[{tagName:'node',getAttribute:key=>key==='new_id'?'456':null}]}};
  }
 };
 const item={type:'node',id:'123',version:'7',tags:{shop:'yes'},element:new XmlNode('node')};
 for(const [key,value] of Object.entries({id:'123',version:'7',lat:'35',lon:'139'}))item.element.setAttribute(key,value);
 const shop=new XmlNode('tag');shop.setAttribute('k','shop');shop.setAttribute('v','yes');item.element.appendChild(shop);
 const review={osm:{type:'node',id:'123',version:'7'},tags:{shop:'yes',level:'0;1'}};
 const saved=await sendOsmTestTags(item,review,'survey');
 assert.equal(saved.newVersion,'8');
 assert.deepEqual(calls.map(c=>[c.method,new URL(c.url).pathname]),[
  ['PUT','/api/0.6/changeset/create'],['PUT','/api/0.6/node/123'],['PUT','/api/0.6/changeset/42/close']
 ]);
 assert.match(calls[0].body,/k="created_by" v="Komorebi Builder"/);
 assert.match(calls[0].body,/k="source" v="survey"/);
 assert.match(calls[0].body,/k="comment" v="add - level : 0;1"/);
 assert.match(calls[1].body,/version="7"/);
 assert.match(calls[1].body,/k="shop" v="yes"/);
 assert.match(calls[1].body,/k="level" v="0;1"/);
 assert.ok(calls.every(c=>c.redirect==='error'),'Writes must not follow redirects');
 calls.length=0;
 // Add and change simultaneously; preserve non-tag element data.
 const nextReview={osm:review.osm,tags:{shop:'supermarket',level:'-1;9',name:'New name'}};
 await sendOsmTestTags(item,nextReview);
 assert.match(calls[1].body,/k="level" v="-1;9"/);
 assert.match(calls[1].body,/k="name" v="New name"/);
 assert.match(calls[1].body,/k="shop" v="supermarket"/);
 assert.match(calls[1].body,/lat="35"/);
 calls.length=0;
 await assert.rejects(sendOsmTestTags(item,{...review,osm:{...review.osm,version:'6'}}),/version/);
 await assert.rejects(sendOsmTestTags(item,{...review,osm:{...review.osm,id:'456'}}),/version/);
 await assert.rejects(sendOsmTestTags(item,{...review,tags:item.tags}),/変更された/);
 assert.equal(calls.length,0,'No changeset for wrong element, stale version or no-op');
 // The low-level TEST writer supports deletion; no editor action exposes it.
 await sendOsmTestTags(item,{...review,tags:{level:'0;1'}});
 assert.doesNotMatch(calls[1].body,/k="shop"/);
 assert.match(calls[1].body,/k="level" v="0;1"/);
 assert.match(calls[0].body,/delete\s+- shop/);
 calls.length=0;
 const copied=await createOsmTestCopy({type:'node',id:'123',tags:{shop:'yes'},points:[{lat:35,lon:139}]});
 assert.equal(copied.id,'456');
 assert.deepEqual(calls.map(c=>[c.method,new URL(c.url).pathname]),[
  ['PUT','/api/0.6/changeset/create'],['POST','/api/0.6/changeset/42/upload'],['PUT','/api/0.6/changeset/42/close']
 ]);
 assert.match(calls[0].body,/k="created_by" v="Komorebi Builder"/);
 assert.ok(calls[0].body.includes('k="comment" v="Copy existing OSM feature for testing (development server only)"'));
 assert.doesNotMatch(calls[0].body,/k="source"/);
 calls.length=0;
 failUpdate=true;
 await assert.rejects(sendOsmTestTags(item,review),/409/);
 assert.equal(new URL(calls.at(-1).url).pathname,'/api/0.6/changeset/42/close');
 failUpdate=false;calls.length=0;
 disconnect=true;
 await assert.rejects(sendOsmTestTags(item,review),/network disconnected/);
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[
  '/api/0.6/changeset/create','/api/0.6/node/123','/api/0.6/changeset/42/close'
 ],'Network failure must not trigger automatic retry');
 disconnect=false;calls.length=0;
 failCreate=true;
 await assert.rejects(sendOsmTestTags(item,review),/503/);
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/0.6/changeset/create']);
 failCreate=false;calls.length=0;
 // Preserve ordered geometry and membership, including repeated references.
 for(const [type,children] of [
  ['way',[['nd',{ref:'10'}],['nd',{ref:'20'}],['nd',{ref:'30'}],['nd',{ref:'10'}]]],
  ['relation',[['member',{type:'way',ref:'10',role:'outer'}],['member',{type:'node',ref:'20',role:''}],['member',{type:'relation',ref:'30',role:'subarea'}],['member',{type:'way',ref:'10',role:'inner'}]]]
 ]){
  const element=new XmlNode(type);
  element.setAttribute('id','123');element.setAttribute('version','7');element.setAttribute('visible','true');
  for(const [name,attrs] of children){
   const child=new XmlNode(name);
   for(const [key,value] of Object.entries(attrs))child.setAttribute(key,value);
   element.appendChild(child);
  }
  const originalTags={name:'Original',note:'Keep me',level:'0'};
  for(const [k,v] of Object.entries(originalTags)){
   const tag=new XmlNode('tag');tag.setAttribute('k',k);tag.setAttribute('v',v);element.appendChild(tag);
  }
  const feature={type,id:'123',version:'7',tags:originalTags,element};
  const change={osm:{type,id:'123',version:'7'},tags:{...originalTags,level:'0;1',description:'Added'}};
  await sendOsmTestTags(feature,change);
  const body=calls[1].body;
  assert.equal(new URL(calls[1].url).pathname,'/api/0.6/'+type+'/123');
  const actualChildren=[...body.matchAll(/<(nd|member) ([^>]+)><\/\1>/g)].map(m=>[m[1],Object.fromEntries([...m[2].matchAll(/([a-z]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]))]);
  assert.deepEqual(actualChildren,children,'Ordered geometry and relation roles must survive tag edits');
  assert.deepEqual(Object.fromEntries([...body.matchAll(/<tag k="([^"]+)" v="([^"]*)"><\/tag>/g)].map(m=>[m[1],m[2]])),change.tags);
  assert.match(body,/version="7"/);
  assert.equal(feature.tags.level,'0','Input snapshot is not mutated');
  assert.equal(calls.length,3);
  calls.length=0;
 }
 failClose=true;
 assert.equal((await sendOsmTestTags(item,review)).newVersion,'8','Close failure must not erase a successful edit');
 failClose=false;calls.length=0;
 await assert.rejects(createOsmApi(OSM_PRODUCTION).write('/node/123','xml','offline-token'),/本番OSMへの書き込みは無効/);
 assert.equal(calls.length,0,'Production write must be rejected before network access');
}finally{
 for(const [key,descriptor] of Object.entries(savedGlobals)){
  if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 }
}

console.log('Komorebi Builder changeset metadata, TEST writers, lifecycle and production write guard PASS (mock HTTP only)');
