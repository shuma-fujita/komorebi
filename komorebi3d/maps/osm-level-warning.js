import {hasTrailingLevelSeparator} from './osm-level-format.js?v=level-format-v1-20261124';
export function syncLevelFormatWarning(row){
 const key=row.children[0]?.value?.trim(),value=row.children[1]?.value;
 let note=row.querySelector('.komo-level-format-warning');
 if(key!=='level'||!hasTrailingLevelSeparator(value)){note?.remove();return;}
 if(note)return;
 note=document.createElement('span');note.className='komo-level-format-warning';
 note.style.cssText='grid-column:1/-1;display:block;color:#ffd08a;font:600 11px/1.5 system-ui;white-space:pre-line;padding:1px 2px 0;';
 note.textContent='⚠️ levelの書式が正しくありません。\n末尾のセミコロンは不要です。';
 row.appendChild(note);
}
