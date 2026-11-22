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
assert.ok(mockScript.indexOf('mountLocalStorageManager(document);')<
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

/* Execute the product's synchronous pre-module panel bootstrap.
   It must keep the fifth panel in its hidden reserve for the + chooser. */
import {runInNewContext} from 'node:vm';
const setupStart=dev.indexOf('const PANEL_LAYOUT=Object.freeze(');
const setupEnd=dev.indexOf('applyPanelLayout(PANEL_LAYOUT);',setupStart);
assert.ok(setupStart>0&&setupEnd>setupStart,'Product pre-module panel layout exists');
const setup=dev.slice(setupStart,setupEnd+'applyPanelLayout(PANEL_LAYOUT);'.length);
const removedEarly=[];
const reserve={id:'panel-reserve'};
const panelNodes=['build','game','test','runtime','storage','obsolete'].map(id=>({
 dataset:{panelId:id},closest(selector){return id==='storage'&&selector==='#panel-reserve'?reserve:null;},
 remove(){removedEarly.push(id);}
}));
const slotNodes=['top','left','right','bottom'].map(id=>({
 dataset:{panelSlot:id},children:[],replaceChildren(){this.children=[];},
 appendChild(panel){this.children.push(panel);}
}));
const mainNode={dataset:{}};
runInNewContext(setup,{document:{
 querySelectorAll(selector){
  if(selector==='[data-panel-slot]')return slotNodes;
  if(selector==='[data-panel-id]')return panelNodes;
  throw Error('Unexpected selector: '+selector);
 },
 querySelector(selector){return selector==='.landscape-main'?mainNode:null;}
}});
assert.deepEqual([...removedEarly],['obsolete'],'Only abandoned non-reserve panels may be removed');
assert.equal(slotNodes.filter(x=>x.children.length===1).length,4,'Four visible slots remain');
assert.equal(panelNodes.find(x=>x.dataset.panelId==='storage').closest('#panel-reserve'),reserve,
 'Hidden storage panel remains registered for the chooser');

const manager=read('komorebi3d/local-storage-panel.js');
assert.ok(manager.includes("confirm.addEventListener('click'"));
assert.ok(manager.includes("remove.addEventListener('click'"));
assert.ok(manager.includes("clear.hidden=!filter.value.length"),'Clear button is shown only while input has content');
assert.ok(manager.includes("clear.addEventListener('click'"),'Clear button responds to user taps');
assert.ok(manager.includes("filter.value=''"),'Clear button resets the query');
assert.ok(manager.includes('  render();\n  filter.focus();'), 'Clearing restores the full key list and input focus');
assert.equal(manager.includes('localStorage.clear('),false,'Never clear the entire origin');
const pending=read('komorebi3d/maps/osm-pending-changes.js');
assert.equal(pending.includes('function migrate('),false,'No automatic old-key migration');
assert.equal(pending.includes('OLD_PRODUCTION'),false,'No legacy-key read path');
console.log('Four slots / five selectable panel types: hidden localStorage manager, remove + add, and inline JS syntax PASS');
