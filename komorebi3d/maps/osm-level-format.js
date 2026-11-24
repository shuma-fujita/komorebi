// Drawing-only normalization. Never mutate the original OSM tag.
export function normalizeDrawingLevel(raw){
 if(raw===undefined||raw===null)return raw;
 const value=String(raw).trim();
 return /^[+-]?\d+(?:\s*;\s*[+-]?\d+)*\s*(?:;\s*)+$/.test(value)?value.replace(/(?:;\s*)+$/,'').trim():value;
}
export function hasTrailingLevelSeparator(raw){
 return raw!==undefined&&raw!==null&&/;\s*$/.test(String(raw));
}
