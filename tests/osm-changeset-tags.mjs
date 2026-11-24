// Verify changeset attribution without API calls or browser access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {OSM_CHANGESET_CREATED_BY,buildOsmChangesetTags} from '../komorebi3d/maps/osm-changeset-tags.js';
import {makeChangesetXml,OSM_TEST_ORIGIN} from '../komorebi3d/maps/osm-test-api.js';

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
 constructor(name){this.name=name;this.attrs=new Map();this.children=[];}
 setAttribute(key,value){this.attrs.set(key,String(value));}
 appendChild(node){this.children.push(node);}
}
const previousDocument=globalThis.document,previousSerializer=globalThis.XMLSerializer;
try{
 globalThis.document={implementation:{createDocument(_namespace,rootName){
  return {documentElement:new XmlNode(rootName),createElement:name=>new XmlNode(name)};
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
}finally{
 if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
 if(previousSerializer===undefined)delete globalThis.XMLSerializer;else globalThis.XMLSerializer=previousSerializer;
}

// Both existing write paths use the same changeset XML creator.
const source=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','komorebi3d','maps','osm-test-api.js'),'utf8');
assert.ok(source.includes("apiWrite('/changeset/create',makeChangesetXml(comment,source),token)"),
 'Test tag update creates a changeset using shared metadata');
assert.ok(source.includes("apiWrite('/changeset/create',makeChangesetXml('Copy existing OSM feature for testing (development server only)'),token)"),
 'Test copy creation uses the same changeset builder');
assert.ok(source.includes('Object.entries(buildOsmChangesetTags(comment,source))'),
 'Changeset XML builder reads the shared metadata, not a test-specific name');

console.log('Komorebi Builder changeset source: omitted, presets, custom, XML and test UI wiring PASS (no OSM requests)');
