// Presentation-only Step 3: mark tag rows already confirmed on production
// OSM but not yet absorbed by the published Geofabrik map.
// This module does not read localStorage or write to OSM.
export const PENDING_GEOFABRIK_LABEL='⚠ Geofabrik反映待ち';
// A local-only review has NOT been sent to OSM. Never label it as an actual
// Geofabrik publication delay, even though it shares the yellow UI treatment.
export const PENDING_LOCAL_REVIEW_LABEL='⚠ 反映待ち（動作確認・OSM未送信）';

export function applyPendingTagVisualStyle(form){
 if(form.querySelector('[data-pending-osm-style]'))return;
 const style=document.createElement('style');
 style.dataset.pendingOsmStyle='true';
 style.textContent=`
 .komo-tags-sheet .komo-tag-row.komo-pending-tag-row,
 .komo-tags-sheet .komo-tag-row.komo-pending-tag-row:nth-child(3n),
 .komo-tags-sheet .komo-tag-row.komo-pending-tag-row:nth-child(3n+2){
  border-color:#ffbd62!important;
  border-left:3px solid #ffbd62!important;
  background:linear-gradient(95deg,rgba(255,176,68,.24),rgba(63,45,27,.8))!important;
  box-shadow:inset 0 0 10px rgba(255,189,98,.1)!important;
 }
 .komo-tags-sheet .komo-tag-row.komo-pending-tag-row input:first-child,
 .komo-tags-sheet .komo-tag-row.komo-pending-tag-row:nth-child(3n) input:first-child,
 .komo-tags-sheet .komo-tag-row.komo-pending-tag-row:nth-child(3n+2) input:first-child{
  color:#ffdf9d!important;
 }
 .komo-tags-sheet .komo-pending-tag-note{
  grid-column:1/-1;display:block;color:#ffd08a;
  font:600 11px/1.5 system-ui,-apple-system,sans-serif;
  padding:1px 2px 0;
 }
 `;
 form.appendChild(style);
}

// Production-confirmed changes and local-only review checks are distinct.
// Both use the approved yellow row style, but keep truthful warning labels.
// The mock's existing pending-only call remains backward compatible.
export function syncPendingTagRows(rows,{pending=null,localReview=null,mapSource='new',dataSource='production'}={}){
 const enabled=mapSource==='new'&&dataSource==='production';
 const official=enabled&&pending?.changes&&typeof pending.changes==='object'&&!Array.isArray(pending.changes)?
  pending.changes:null;
 const local=enabled&&localReview?.changes&&typeof localReview.changes==='object'&&!Array.isArray(localReview.changes)?
  localReview.changes:null;
 for(const row of rows.children){
  if(!row.classList?.contains('komo-tag-row'))continue;
  const key=row.children[0]?.value?.trim()||'';
  const isOfficial=!!key&&!!official&&Object.prototype.hasOwnProperty.call(official,key);
  const isLocal=!!key&&!!local&&Object.prototype.hasOwnProperty.call(local,key);
  row.classList.toggle('komo-pending-tag-row',isOfficial||isLocal);
  for(const [kind,show,labelText] of [
   ['production',isOfficial,PENDING_GEOFABRIK_LABEL],
   ['local',isLocal,PENDING_LOCAL_REVIEW_LABEL]
  ]){
   let note=row.querySelector('.komo-pending-tag-note[data-pending-kind="'+kind+'"]');
   if(show){
    if(!note){
     note=document.createElement('span');
     note.className='komo-pending-tag-note';
     note.dataset.pendingKind=kind;
     row.appendChild(note);
    }
    note.textContent=labelText;
   }else note?.remove();
  }
 }
}
