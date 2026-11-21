// Fifth-panel structure and inline game module syntax checks.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const {PANEL_IDS,SLOT_IDS,transitionPanelLayout}=await import('../komorebi3d/dev-panel-layout.js');
assert.deepEqual(PANEL_IDS,['build','game','test','runtime','storage']);
assert.deepEqual(SLOT_IDS,['top','left','right','bottom','storage']);
const initial={top:'build',left:'game',right:'test',bottom:'runtime',storage:'storage'};
assert.deepEqual(transitionPanelLayout(initial,{type:'swap',from:'storage',to:'bottom'}),
 {top:'build',left:'game',right:'test',bottom:'storage',storage:'runtime'});
assert.equal(transitionPanelLayout(initial,{type:'remove',from:'storage'}).storage,null);
for(const page of ['komorebi3d/dev.html','komorebi3d/mock.html']){
 const html=read(page);
 assert.equal((html.match(/data-panel-slot="storage"/g)||[]).length,1,page+' storage slot');
 assert.equal((html.match(/data-panel-id="storage"/g)||[]).length,1,page+' storage panel');
 assert.ok(html.includes('id="storage-entries"'),page+' inventory');
 assert.ok(html.includes('id="storage-refresh"'),page+' refresh');
 assert.ok(html.includes('id="storage-filter"'),page+' search');
}
const dev=read('komorebi3d/dev.html');
const match=dev.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match,'Game module script exists');
const parsed=spawnSync(process.execPath,['--check','--input-type=module'],{
 input:match[1],encoding:'utf8'
});
assert.equal(parsed.status,0,'Inline game JS must parse: '+parsed.stderr);
const manager=read('komorebi3d/local-storage-panel.js');
assert.ok(manager.includes("confirm.addEventListener('click'"));
assert.ok(manager.includes("remove.addEventListener('click'"));
assert.equal(manager.includes('localStorage.clear('),false,'Never clear the entire origin');
const pending=read('komorebi3d/maps/osm-pending-changes.js');
assert.equal(pending.includes('function migrate('),false,'No automatic old-key migration');
assert.equal(pending.includes('OLD_PRODUCTION'),false,'No legacy-key read path');
console.log('Five-panel localStorage manager: structure, layout, and inline game module syntax PASS');
