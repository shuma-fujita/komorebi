import {hasTrailingLevelSeparator} from './osm-level-format.js?v=level-format-v1-20261124';
export function levelFormatWarning(raw){
 return hasTrailingLevelSeparator(raw)?'⚠ levelの書式が正しくありません。\n末尾の「;」は不要です。':null;
}
// The editor uses the existing pending-warning CSS with an independent flag.
// The directory uses its existing warning-row renderer for all warning types.
export function syncLevelTagRowWarning(row){
 const key=row.children[0]?.value?.trim(),value=row.children[1]?.value;
 const message=levelFormatWarning(key==='level'?value:undefined);
 row.classList.toggle('komo-level-format-row',Boolean(message));
 let note=row.querySelector('.komo-level-format-warning');
 if(!message){note?.remove();return;}
 if(!note){
  note=document.createElement('span');note.className='komo-level-format-warning';
  row.appendChild(note);
 }
 note.textContent=message;
}
