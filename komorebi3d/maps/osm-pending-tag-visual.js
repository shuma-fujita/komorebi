// Presentation-only Step 3: mark tag rows already confirmed on production
// OSM but not yet absorbed by the published Geofabrik map.
// This module does not read localStorage or write to OSM.
export const PENDING_GEOFABRIK_LABEL='⚠ Geofabrik反映待ち';
// Legacy export retained for older callers; the on-screen warning is uniform.
// Review-only entries still never go to the production-success storage.
export const PENDING_LOCAL_REVIEW_LABEL=PENDING_GEOFABRIK_LABEL;

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
  grid-column:1/-1;display:block;min-width:0;color:#ffd08a;
  font:600 11px/1.5 system-ui,-apple-system,sans-serif;
  padding:1px 2px 0;
  white-space:normal;overflow-wrap:anywhere;word-break:normal;
 }
 `;
 form.appendChild(style);
}

// Both proven production writes and review-only localStorage writes reach
// the same visible pending-row presentation. Their storage/provenance remains
// separate; no review-only operation is treated as a remote OSM save.
export function syncPendingTagRows(rows,{pending=null,localReview=null,mapSource='new',dataSource='production'}={}){
 const enabled=mapSource==='new'&&dataSource==='production';
 const official=enabled&&pending?.changes&&typeof pending.changes==='object'&&!Array.isArray(pending.changes)?
  pending.changes:null;
 const local=enabled&&localReview?.changes&&typeof localReview.changes==='object'&&!Array.isArray(localReview.changes)?
  localReview.changes:null;
 for(const row of rows.children){
  if(!row.classList?.contains('komo-tag-row'))continue;
  const key=row.children[0]?.value?.trim()||'';
  const highlighted=!!key&&(
   (!!official&&Object.prototype.hasOwnProperty.call(official,key))||
   (!!local&&Object.prototype.hasOwnProperty.call(local,key))
  );
  row.classList.toggle('komo-pending-tag-row',highlighted);
  const existing=[...row.querySelectorAll('.komo-pending-tag-note')];
  if(!highlighted){
   for(const note of existing)note.remove();
   continue;
  }
  const note=existing.shift()||document.createElement('span');
  note.className='komo-pending-tag-note';
  note.dataset.pendingKind='combined';
  note.textContent=PENDING_GEOFABRIK_LABEL;
  if(!note.isConnected)row.appendChild(note);
  for(const duplicate of existing)duplicate.remove();
 }
}
