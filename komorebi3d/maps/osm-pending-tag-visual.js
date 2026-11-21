// Presentation-only Step 3: mark tag rows already confirmed on production
// OSM but not yet absorbed by the published Geofabrik map.
// This module does not read localStorage or write to OSM.
export const PENDING_GEOFABRIK_LABEL='⚠ Geofabrik反映待ち';

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

// Only a confirmed production change on the Geofabrik NEW map is pending.
// The input rows are the same native OSM tag rows used by the real editor.
export function syncPendingTagRows(rows,{pending=null,mapSource='new',dataSource='production'}={}){
 const keys=(mapSource==='new'&&dataSource==='production'&&pending?.changes&&
  typeof pending.changes==='object'&&!Array.isArray(pending.changes))?
  pending.changes:null;
 for(const row of rows.children){
  if(!row.classList?.contains('komo-tag-row'))continue;
  const key=row.children[0]?.value?.trim()||'';
  const highlighted=!!key&&!!keys&&Object.prototype.hasOwnProperty.call(keys,key);
  row.classList.toggle('komo-pending-tag-row',highlighted);
  let label=row.querySelector('.komo-pending-tag-note');
  if(highlighted){
   if(!label){
    label=document.createElement('span');
    label.className='komo-pending-tag-note';
    label.textContent=PENDING_GEOFABRIK_LABEL;
    row.appendChild(label);
   }
  }else label?.remove();
 }
}
