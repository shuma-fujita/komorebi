// Tiny non-interactive label for the JSON file backing each visible Matsudo map.
export function createMapFilenameIndicator(panel){
 if(!panel)return {setFilename(){}};
 const label=document.createElement('div');
 label.className='komo-map-filename-indicator';
 label.setAttribute('aria-label','表示中の地図JSONファイル名');
 label.style.cssText='position:absolute;right:6px;bottom:6px;z-index:1;max-width:calc(100% - 12px);padding:3px 5px;border-radius:4px;background:rgba(7,18,15,.35);color:rgba(247,255,249,.72);font:9px/1.3 ui-monospace,SFMono-Regular,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;user-select:none;';
 label.hidden=true;
 panel.appendChild(label);
 return {
  setFilename(filename){
   const name=typeof filename==='string'?filename:'';
   label.textContent=name;
   label.title=name;
   label.hidden=!name;
  }
 };
}
