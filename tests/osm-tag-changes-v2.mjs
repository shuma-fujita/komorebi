// Regression tests for the one-key OSM tag-change cache.
import assert from 'node:assert/strict';
const data=new Map();
const store={
 get length(){return data.size;},
 key(i){return [...data.keys()][i]??null;},
 getItem(key){return data.has(key)?data.get(key):null;},
 setItem(key,value){data.set(key,String(value));},
 removeItem(key){data.delete(key);}
};
Object.defineProperty(globalThis,'localStorage',{value:store,configurable:true});
const {getSavedOsmTagChange,getAllSavedOsmTagChanges,saveStoredOsmTagChange,
 releaseStoredOsmTagChange,recordConfirmedOsmTagChanges,reconcilePendingOsmTagChanges,
 applySavedOsmTagChangesToMap,osmTagChangeStorageKey}
 =await import('../komorebi3d/maps/osm-pending-changes.js');
const base={'building:levels':'4'},next={'building:levels':'5'};
const draft=(id)=>({type:'way',id:String(id),osmVersion:null,
 changes:next,tags:next,baseTags:base});
const map=(id,version,tags)=>({elements:[{type:'way',id:String(id),version,tags:{...tags}}]});

saveStoredOsmTagChange(draft(1));
assert.equal(data.size,1);
assert.ok(data.has('komorebi3d:osm-tag-changes:v2:way/1'));
assert.equal(getSavedOsmTagChange('way',1).osmVersion,null);
assert.equal(reconcilePendingOsmTagChanges(map(1,99,base),{source:'new'}),0);
assert.equal(data.size,1,'A newer version alone does not clear a local review');
const snapshot=map(1,12,base);
assert.equal(applySavedOsmTagChangesToMap(snapshot,{source:'new'}),1);
assert.equal(snapshot.elements[0].version,12,'A test overlay does not change the OSM source version');
assert.equal(snapshot.elements[0].tags['building:levels'],'5');
assert.equal(snapshot.reviewStorageOriginalTags.get('way/1')['building:levels'],'4');
assert.equal(reconcilePendingOsmTagChanges(map(1,99,next),{source:'old'}),0);
assert.equal(reconcilePendingOsmTagChanges({elements:[]},{source:'new'}),0);
assert.equal(reconcilePendingOsmTagChanges(map(1,99,{...next,name:'Unrelated tag'}),{source:'new'}),1);
assert.equal(data.size,0,'Matching local changes are automatically cleared');
saveStoredOsmTagChange({...draft(1),changes:{...next,name:null,shop:'yes'}});
assert.equal(reconcilePendingOsmTagChanges(map(1,100,{...next,shop:'yes',name:'Still present'}),{source:'new'}),0);
assert.equal(reconcilePendingOsmTagChanges(map(1,100,{...next}),{source:'new'}),0);
assert.equal(reconcilePendingOsmTagChanges(map(1,100,{...next,shop:'yes'}),{source:'new'}),1);
assert.equal(data.size,0);

const sent=recordConfirmedOsmTagChanges({type:'way',id:'2',version:17,changes:next});
assert.equal(sent.entry.version,17,'The downstream 3D patcher still receives version');
assert.equal(getSavedOsmTagChange('way',2).osmVersion,17);
assert.throws(()=>saveStoredOsmTagChange(draft(2)),/本番送信済み/);
assert.equal(reconcilePendingOsmTagChanges(map(2,16,base),{source:'new'}),0);
assert.equal(data.size,1);
assert.equal(reconcilePendingOsmTagChanges(map(2,17,next),{source:'old'}),0);
assert.equal(data.size,1,'Never reconcile against the old comparison map');
assert.equal(reconcilePendingOsmTagChanges(map(2,16,next),{source:'new'}),0);
assert.equal(reconcilePendingOsmTagChanges(map(2,null,next),{source:'new'}),0);
assert.equal(applySavedOsmTagChangesToMap(map(2,17,base),{source:'new'}),0,'Do not overlay an already reached version');
assert.equal(reconcilePendingOsmTagChanges(map(2,17,base),{source:'new'}),1);
assert.equal(data.size,0);
assert.equal(getSavedOsmTagChange('way',2),null);
recordConfirmedOsmTagChanges({type:'way',id:'2',version:17,changes:next});
assert.equal(reconcilePendingOsmTagChanges(map(2,18,base),{source:'new'}),1);
assert.equal(data.size,0,'Later OSM versions supersede local edits');

// Old-format keys are visible to the administrator but never moved or
// silently deleted by current OSM code.
const oldProduction='komorebi3d:osm-production-pending:v1:';
const oldReview='komorebi3d:osm-review-storage-check:v1:';
data.set(oldReview+'way/3',JSON.stringify({
 type:'way',id:'3',version:null,changes:next,tags:next,baseTags:base
}));
data.set(oldProduction+'way/4',JSON.stringify({
 type:'way',id:'4',version:13,changes:next
}));
assert.equal(getSavedOsmTagChange('way',3),null,'Legacy review must never be migrated');
assert.equal(getSavedOsmTagChange('way',4),null,'Legacy production must never be migrated');
assert.equal(getAllSavedOsmTagChanges().length,0,'Only canonical v2 keys are active');
assert.equal(data.size,2,'No old data should be removed without an explicit delete');
releaseStoredOsmTagChange('way',3);
assert.equal(data.size,2,'Releasing v2 never removes the old key');

const {listLocalStorage,deleteLocalStorageKey,keyDescription}
 =await import('../komorebi3d/local-storage-panel.js');
assert.deepEqual(listLocalStorage().map(entry=>entry.key).sort(),
 [oldProduction+'way/4',oldReview+'way/3'].sort());
assert.match(keyDescription(oldProduction+'way/4'),/旧形式/);
const reviewed=data.get(oldReview+'way/3');
assert.throws(()=>deleteLocalStorageKey(oldReview+'way/3','stale'),/変更されました/);
assert.equal(data.size,2,'Failed confirmation must preserve data');
const removed=deleteLocalStorageKey(oldReview+'way/3',reviewed);
assert.equal(removed.key,oldReview+'way/3');
assert.equal(data.size,1,'Only the selected legacy key is deleted');
deleteLocalStorageKey(oldProduction+'way/4',data.get(oldProduction+'way/4'));
assert.equal(data.size,0);

// Removing a canonical key through the manager invokes the same release API.
saveStoredOsmTagChange(draft(6));
const key=osmTagChangeStorageKey('way','6');
const snapshotValue=data.get(key);
const administrative=deleteLocalStorageKey(key,snapshotValue);
assert.deepEqual(administrative.osm,{type:'way',id:'6'});
assert.equal(data.has(key),false);
assert.equal(getSavedOsmTagChange('way',6),null);
console.log('OSM unified storage + localStorage manager: save, release, reconciliation, no migration, individual deletion PASS');
