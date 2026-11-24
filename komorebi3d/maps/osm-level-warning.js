import {hasTrailingLevelSeparator} from './osm-level-format.js?v=level-format-v1-20261124';
export function levelFormatWarning(raw){
 return hasTrailingLevelSeparator(raw)?'⚠️ levelの書式が正しくありません。\n末尾のセミコロンは不要です。':null;
}
// Shared presentation for the real tag editor and building tenant directory.
export function syncLevelFormatWarning(row,raw,{tagRow=false}={}){
 const message=levelFormatWarning(raw);
 let note=row.querySelector('.komo-level-format-warning');
 if(!message){note?.remove();return;}
 if(!note){
  note=document.createElement('span');note.className='komo-level-format-warning';
  note.style.cssText=(tagRow?'grid-column:1/-1;':'')+'display:block;color:#ffd08a;font:600 11px/1.5 system-ui,-apple-system,sans-serif;white-space:pre-line;overflow-wrap:anywhere;padding:1px 2px 0;';
  row.appendChild(note);
 }
 note.textContent=message;
}
export function syncLevelTagRowWarning(row){
 const key=row.children[0]?.value?.trim(),value=row.children[1]?.value;
 syncLevelFormatWarning(row,key==='level'?value:undefined,{tagRow:true});
}
