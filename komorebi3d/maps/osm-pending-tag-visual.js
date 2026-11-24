// Presentation-only Step 3: mark tag rows already confirmed on production
// OSM but not yet absorbed by the published Geofabrik map.
// This module does not read localStorage or write to OSM.
export const PENDING_GEOFABRIK_LABEL='⚠ Geofabrik反映待ち';

export function applyPendingTagVisualStyle(form){
 if(form.querySelector('[data-pending-osm-style]'))return;
 const style=document.createElement('style');
 style.dataset.pendingOsmStyle='true';
 style.textContent=`
 .komo-tags-sheet .komo-tag-row:is(.komo-pending-tag-row,.komo-level-format-row),
 .komo-tags-sheet .komo-tag-row:is(.komo-pending-tag-row,.komo-level-format-row):nth-child(3n),
 .komo-tags-sheet .komo-tag-row:is(.komo-pending-tag-row,.komo-level-format-row):nth-child(3n+2){
  border-color:#ffbd62!important;
  border-left:3px solid #ffbd62!important;
  background:linear-gradient(95deg,rgba(255,176,68,.24),rgba(63,45,27,.8))!important;
  box-shadow:inset 0 0 10px rgba(255,189,98,.1)!important;
 }
 .komo-tags-sheet .komo-tag-row:is(.komo-pending-tag-row,.komo-level-format-row) input:first-child,
 .komo-tags-sheet .komo-tag-row:is(.komo-pending-tag-row,.komo-level-format-row):nth-child(3n) input:first-child,
 .komo-tags-sheet .komo-tag-row:is(.komo-pending-tag-row,.komo-level-format-row):nth-child(3n+2) input:first-child{
  color:#ffdf9d!important;
 }
 .komo-tags-sheet :is(.komo-pending-tag-note,.komo-level-format-warning){
  grid-column:1/-1;display:block;min-width:0;color:#ffd08a;
  font:600 11px/1.5 system-ui,-apple-system,sans-serif;
  padding:1px 2px 0;
  white-space:normal;overflow-wrap:anywhere;word-break:normal;
 }
 .komo-tags-sheet .komo-level-format-warning{
  white-space:pre-line;
 }
 `;
 form.appendChild(style);
}

// All saved OSM tag changes render the same pending-row visual.
// Both local reviews and confirmed OSM writes have one canonical entry.
export function syncPendingTagRows(rows,{entry=null,pending=null,localReview=null,mapSource='new',dataSource='production'}={}){
 const enabled=mapSource==='new'&&dataSource==='production';
 // The legacy optional args keep the independent mock sample working.
 const sources=enabled?[entry?.changes,entry?.confirmedOsm?.changes,pending?.changes,localReview?.changes]:[];
 const changedKeys=new Set();
 for(const source of sources)if(source&&typeof source==='object'&&!Array.isArray(source))
  for(const key of Object.keys(source))changedKeys.add(key);
 for(const row of rows.children){
  if(!row.classList?.contains('komo-tag-row'))continue;
  const key=row.children[0]?.value?.trim()||'';
  const highlighted=!!key&&changedKeys.has(key);
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
