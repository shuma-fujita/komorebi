// Four visible slots, five selectable panel types, and inline game syntax checks.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const {PANEL_IDS,SLOT_IDS,transitionPanelLayout}=await import('../komorebi3d/dev-panel-layout.js');
assert.deepEqual(PANEL_IDS,['build','game','test','runtime','storage']);
assert.deepEqual(SLOT_IDS,['top','left','right','bottom']);
const initial={top:'build',left:'game',right:'test',bottom:'runtime'};
const removed=transitionPanelLayout(initial,{type:'remove',from:'bottom'});
assert.deepEqual(removed,{top:'build',left:'game',right:'test',bottom:null});
const added=transitionPanelLayout(removed,{type:'add',from:'bottom',panel:'storage'});
assert.deepEqual(added,{top:'build',left:'game',right:'test',bottom:'storage'});
assert.throws(()=>transitionPanelLayout(initial,{type:'add',from:'bottom',panel:'storage'}),/cannot be added/i);
assert.deepEqual(transitionPanelLayout(added,{type:'swap',from:'bottom',to:'top'}),
 {top:'storage',left:'game',right:'test',bottom:'build'});
assert.deepEqual(transitionPanelLayout(added,{type:'remove',from:'bottom'}),removed);
for(const page of ['komorebi3d/dev.html','komorebi3d/mock.html']){
 const html=read(page);
 assert.equal((html.match(/data-panel-slot="/g)||[]).length,4,page+' exactly four visible slots');
 for(const id of ['top','left','right','bottom'])
  assert.equal((html.match(new RegExp('data-panel-slot="'+id+'"','g'))||[]).length,1,page+' slot '+id);
 assert.equal((html.match(/data-panel-slot="storage"/g)||[]).length,0,page+' no fifth slot');
 assert.equal((html.match(/data-panel-id="storage"/g)||[]).length,1,page+' optional storage panel exists');
 assert.match(html,/<div id="panel-reserve" hidden><section id="storage-panel" data-panel-id="storage"/,page+' hidden panel reserve');
 assert.ok(html.includes('id="storage-entries"'),page+' inventory');
 assert.ok(html.includes('id="storage-refresh"'),page+' refresh');
 assert.ok(html.includes('id="storage-filter"'),page+' search');
 assert.ok(html.includes('id="storage-filter-clear"'),page+' clear search button');
 assert.ok(html.includes('aria-label="検索ワードを消去"'),page+' accessible clear label');
 assert.ok(html.includes('.storage-filter-field .storage-filter-clear[hidden]{display:none}'),page+' hidden clear button styling');
}
const layoutSource=read('komorebi3d/dev-panel-layout.js');
assert.ok(layoutSource.includes("for(const [id,panel] of panels)"),'Unused optional panels are registered and parked');
assert.ok(layoutSource.includes("parked.appendChild(panel)"),'Unused panels remain available in the + menu');
assert.ok(layoutSource.includes("panel-shown"),'Layout announces adding a previously hidden panel');
assert.ok(layoutSource.includes("onGripDown"),'Existing info-icon drag removal remains intact');
const mockScript=read('komorebi3d/mock-ui.js');
assert.ok(mockScript.indexOf('mountLocalStorageManager(document,{readOnly:true});')<
 mockScript.indexOf('mountDefaultPanelLayoutEditor(document);'),
 'Mock must mount the manager before the hidden panel is parked');
const dev=read('komorebi3d/dev.html');
assert.ok(dev.indexOf('mountLocalStorageManager(document);')<
 dev.indexOf('mountDefaultPanelLayoutEditor(document);'),
 'Game must mount the manager before the hidden panel is parked');
const match=dev.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match,'Game module script exists');
const parsed=spawnSync(process.execPath,['--check','--input-type=module'],{
 input:match[1],encoding:'utf8'
});
assert.equal(parsed.status,0,'Inline game JS must parse: '+parsed.stderr);

// The shared HTML defines the same initial slots for both pages. Product no
// longer runs a separate synchronous panel bootstrap that could delete storage.
const initialPanels={top:'build',left:'game',right:'test',bottom:'runtime'};
for(const page of ['komorebi3d/dev.html','komorebi3d/mock.html']){
 const html=read(page);
 for(const [slot,id] of Object.entries(initialPanels)){
  const anchor='data-panel-slot="'+slot+'">';
  const index=html.indexOf(anchor);
  assert.ok(index>=0,page+' has the '+slot+' slot');
  assert.match(html.slice(index,index+300),new RegExp('data-panel-id="'+id+'"'),
   page+' initially places '+id+' in '+slot);
 }
 const reserveAt=html.indexOf('id="panel-reserve" hidden>');
 assert.ok(reserveAt>=0,page+' keeps the optional panel reserve');
 assert.match(html.slice(reserveAt,reserveAt+190),/data-panel-id="storage"/,
  page+' keeps storage in the reserve');
}
const canonicalShell=read('komorebi3d/page-shell.html');
for(const [slot,id] of Object.entries(initialPanels)){
 assert.match(canonicalShell,new RegExp('data-panel-slot="'+slot+'".*?@panel:'+id),
  'Shared page shell owns initial '+slot+' assignment');
}
assert.match(canonicalShell,/id="panel-reserve" hidden>.*?@panel:storage/,
 'Shared page shell owns the optional storage reserve');
assert.equal(dev.includes('const PANEL_LAYOUT='),false,
 'Product must not define a second panel layout');
assert.equal(dev.includes('function applyPanelLayout('),false,
 'Product must not have a second layout bootstrap');
assert.equal(dev.split('mountDefaultPanelLayoutEditor(document);').length-1,1,
 'Product initializes the shared panel controller exactly once');
assert.equal(mockScript.split('mountDefaultPanelLayoutEditor(document);').length-1,1,
 'Mock initializes the same shared panel controller exactly once');
assert.equal(dev.includes('panel.remove()'),false,
 'Product must not discard optional panels before the shared controller');

const manager=read('komorebi3d/local-storage-panel.js');
assert.ok(manager.includes("confirm.addEventListener('click'"));
assert.equal(manager.includes('copyKeys'),false,'Mock and game share the same tap-to-search behavior');
assert.equal(manager.includes('clipboard.writeText'),false,'Tapping a storage key never copies it');
assert.ok(manager.includes("const keyButton=text('button',item.key,'storage-entry-key')"),'Full storage key is tappable');
assert.ok(manager.includes("keyButton.addEventListener('click'"),'Key tap has a handler');
assert.ok(manager.includes('filter.value=item.key;'),'Entire key, not a parsed ID, is sent to search');
const {storedOsmName}=await import('../komorebi3d/local-storage-panel.js');
const sampleKey='komorebi3d:osm-tag-changes:v2:node/10294624701';
assert.equal(storedOsmName(sampleKey,JSON.stringify({tags:{name:'日高屋'},changes:{level:'0'}})),'日高屋');
assert.equal(storedOsmName(sampleKey,JSON.stringify({changes:{name:'吉野家'}})),'吉野家');
assert.equal(storedOsmName(sampleKey,JSON.stringify({tags:{'name:ja':'とんかつとん一'}})),'とんかつとん一');
assert.equal(storedOsmName(sampleKey,JSON.stringify({changes:{level:'0'}})),'');
assert.equal(storedOsmName('unrelated-key',JSON.stringify({tags:{name:'日高屋'}})),'');
assert.equal(storedOsmName(sampleKey,'invalid-json'),'');
assert.ok(manager.includes("const nameLabel=text('span',name,'storage-entry-name')"),'OSM name appears on meta row');
assert.ok(manager.includes('storedOsmName(item.key,item.value).toLocaleLowerCase().includes(q)'),'Name is searchable');
assert.ok(manager.includes("render();\n    filter.scrollIntoView?."),'Key tap filters immediately');
assert.equal(manager.includes('osmMatch'),false,'No OSM-only condition');
assert.equal(manager.includes('storage-id-tap'),false,'No nested ID-only control');
assert.ok(mockScript.includes('mountLocalStorageManager(document,{readOnly:true});'),'Mock mounts read-only manager');
assert.ok(dev.includes('mountLocalStorageManager(document);'),'Game mounts manager');
assert.ok(dev.includes('storage-name-readonly-v1-20261123'),'Game references current module');
assert.ok(mockScript.includes('storage-name-readonly-v1-20261123'),'Mock references same module');
assert.ok(read('komorebi3d/mock.html').includes('mock-storage-key-search-20261122'),'Mock entry references updated script');
assert.ok(read('komorebi3d/build-ui.mjs').includes('mock-storage-key-search-20261122'),'Mock generator matches script');

assert.ok(manager.includes("remove.addEventListener('click'"));
assert.ok(manager.includes("if(readOnly){"),'Mock must skip real deletion controls');
assert.match(manager,/if\(readOnly\)\{\s*entries\.appendChild\(row\);\s*continue;/,'Read-only rows return before delete handlers');
assert.ok(manager.includes("clear.hidden=!filter.value.length"),'Clear button is shown only while input has content');
assert.ok(manager.includes("clear.addEventListener('click'"),'Clear button responds to user taps');
assert.ok(manager.includes("filter.value=''"),'Clear button resets the query');
assert.ok(manager.includes('  render();\n  filter.focus();'), 'Clearing restores the full key list and input focus');
assert.equal(manager.includes('localStorage.clear('),false,'Never clear the entire origin');
const pending=read('komorebi3d/maps/osm-pending-changes.js');
assert.equal(pending.includes('function migrate('),false,'No automatic old-key migration');
assert.equal(pending.includes('OLD_PRODUCTION'),false,'No legacy-key read path');
console.log('Four slots / five selectable panel types: hidden localStorage manager, remove + add, and inline JS syntax PASS');
