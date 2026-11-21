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
assert.equal(reconcilePendingOsmTagChanges(map(1,99,next),{source:'new'}),0);
assert.equal(data.size,1,'A local review must never be auto-cleared');
const snapshot=map(1,12,base);
assert.equal(applySavedOsmTagChangesToMap(snapshot,{source:'new'}),1);
assert.equal(snapshot.elements[0].version,12,'A test overlay does not change the OSM source version');
assert.equal(snapshot.elements[0].tags['building:levels'],'5');
assert.equal(snapshot.reviewStorageOriginalTags.get('way/1')['building:levels'],'4');
releaseStoredOsmTagChange('way',1);
assert.equal(data.size,0);

const sent=recordConfirmedOsmTagChanges({type:'way',id:'2',version:17,changes:next});
assert.equal(sent.entry.version,17,'The downstream 3D patcher still receives version');
assert.equal(getSavedOsmTagChange('way',2).osmVersion,17);
assert.throws(()=>saveStoredOsmTagChange(draft(2)),/本番送信済み/);
assert.equal(reconcilePendingOsmTagChanges(map(2,16,base),{source:'new'}),0);
assert.equal(data.size,1);
assert.equal(reconcilePendingOsmTagChanges(map(2,17,next),{source:'old'}),0);
assert.equal(data.size,1,'Never reconcile against the old comparison map');
assert.equal(reconcilePendingOsmTagChanges(map(2,17,next),{source:'new'}),1);
assert.equal(data.size,0);
assert.equal(getSavedOsmTagChange('way',2),null);

const oldProduction='komorebi3d:osm-production-pending:v1:';
const oldReview='komorebi3d:osm-review-storage-check:v1:';
data.set(oldReview+'way/3',JSON.stringify({
 type:'way',id:'3',version:null,changes:next,tags:next,baseTags:base
}));
assert.equal(getSavedOsmTagChange('way',3).osmVersion,null);
assert.equal(data.size,1);
assert.equal(data.has(oldReview+'way/3'),false);
assert.equal(data.has(osmTagChangeStorageKey('way','3')),true);
data.clear();
data.set(oldProduction+'way/4',JSON.stringify({
 type:'way',id:'4',version:13,changes:next
}));
assert.equal(getSavedOsmTagChange('way',4).osmVersion,13);
assert.equal(data.size,1);
assert.equal(data.has(oldProduction+'way/4'),false);
data.clear();
data.set(oldProduction+'way/5',JSON.stringify({
 type:'way',id:'5',version:17,changes:{name:'sent'}
}));
data.set(oldReview+'way/5',JSON.stringify({
 type:'way',id:'5',version:null,changes:next,
 tags:{...next,name:'local'},baseTags:{...base,name:'original'}
}));
const merged=getSavedOsmTagChange('way',5);
assert.equal(merged.osmVersion,null);
assert.equal(merged.confirmedOsm.osmVersion,17);
assert.equal(data.size,1,'Two legacy sources must merge to one key without losing either');
assert.equal(getAllSavedOsmTagChanges().length,1);
assert.equal(reconcilePendingOsmTagChanges(map(5,18,{name:'sent'}),{source:'new'}),1);
assert.equal(getSavedOsmTagChange('way',5).confirmedOsm,null);
assert.equal(data.size,1,'A local draft survives reconciling its nested confirmed write');
releaseStoredOsmTagChange('way',5);
assert.equal(data.size,0);
console.log('OSM unified storage: test save/release, confirmed reconciliation, and migration PASS');
