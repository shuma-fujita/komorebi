// OSM element pages (not changesets): open the environment-specific URL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {osmElementPageUrl} from '../komorebi3d/maps/osm-element-page-url.js';
import {OSM_TEST_ORIGIN} from '../komorebi3d/maps/osm-test-api.js';

const production={type:'way',id:'456789'};
const copied={type:'way',id:'987654'};
assert.equal(osmElementPageUrl('production',production,copied),
 'https://www.openstreetmap.org/way/456789');
assert.equal(osmElementPageUrl('test',production,copied),OSM_TEST_ORIGIN+'/way/987654');
assert.equal(osmElementPageUrl('test',production,null),null,'no copied test target: hide link');
assert.equal(osmElementPageUrl('production',production,null),
 'https://www.openstreetmap.org/way/456789','production link remains available');
assert.equal(osmElementPageUrl('production',{type:'node',id:123},copied),
 'https://www.openstreetmap.org/node/123');
assert.equal(osmElementPageUrl('test',production,{type:'relation',id:'2024'}),
 OSM_TEST_ORIGIN+'/relation/2024');
for(const target of [{type:'way',id:'0'},{type:'way',id:'-1'},{type:'way',id:'1x'},
 {type:'unknown',id:123},{type:'node',id:null},null]){
 assert.equal(osmElementPageUrl('production',target,copied),null,
  'invalid OSM target must not become a page link');
}
assert.equal(osmElementPageUrl('unexpected',production,copied),null);
const mapSource=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','komorebi3d','maps','map-labels.js'),'utf8');
assert.ok(mapSource.includes('osmElementPageUrl(activeSource,'),'current source chooses the destination');
assert.ok(mapSource.includes('{type:item.osmType,id:item.osmId},linkedTestTarget)'),
 'test source uses the saved copied ID, not the production ID');
assert.ok(mapSource.includes('   refreshOsmPageLink();'),'source switch refreshes link');
assert.ok(mapSource.includes('await setSource(\'test\');'),'new copies select the test view');
assert.ok(mapSource.includes('osmPageLink.target=\'_blank\';osmPageLink.rel=\'noopener noreferrer\';'));
assert.ok(mapSource.includes('form.append(header,copyPane,sourceRow,osmPageLink,sourceStatus,'),
 'link sits beneath the source selector');
assert.ok(mapSource.includes('sourceRow.hidden=true;sourceStatus.hidden=true;osmPageLink.hidden=true;'),
 'link is hidden with selector in review');
assert.ok(mapSource.includes('sourceRow.hidden=false;sourceStatus.hidden=false;refreshOsmPageLink();'),
 'link returns on editing');
console.log('OSM element page links by environment, saved copy ID, no-copy fallback, safety and editor wiring PASS');
