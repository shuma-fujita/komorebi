// Temporary opt-in geometry trace: activate with ?editorDiag=1.
// Records layout numbers and tag row/column focus targets, never tag values.
// Values and key names are intentionally never inspected. Row numbers are 1-based.
export function tagFieldLocation(target,sheet){
 if(!(target instanceof Element)||!sheet.contains(target))return '-';
 const row=target.closest('.komo-tag-row');
 if(!row||!sheet.contains(row))return 'other';
 const siblings=row.parentElement?.children;
 const rowNumber=siblings?Array.prototype.indexOf.call(siblings,row)+1:0;
 const column=target===row.children[0]?'left-key':target===row.children[1]?'right-value':'other';
 return `row${rowNumber||'?'}:${column}`;
}
export function attachEditorKeyboardDiagnostics({game,host,mask,sheet}){
 const vv=window.visualViewport,slot=game.closest('.panel-slot-main');
 if(!vv)return {destroy(){}};
 const panel=document.createElement('div');
 panel.setAttribute('role','region');
 panel.setAttribute('aria-label','キーボード位置診断');
 panel.style.cssText='position:fixed;z-index:2147483647;top:max(10px,env(safe-area-inset-top));left:8px;right:8px;padding:8px;border:1px solid #6bf0b5;border-radius:9px;background:#071b18ef;color:#e0fff0;font:11px/1.35 ui-monospace,Menlo,monospace;box-shadow:0 2px 15px #0008;max-height:46vh;overflow:hidden;pointer-events:auto';
 const bar=document.createElement('div');
 bar.style.cssText='display:flex;gap:8px;align-items:center;justify-content:space-between';
 const title=document.createElement('span');title.textContent='📐 ビルタグ位置診断（数値のみ）';
 const expand=document.createElement('button');expand.type='button';expand.textContent='ログ表示';
 const copy=document.createElement('button');copy.type='button';copy.textContent='コピー';
 for(const b of [expand,copy])b.style.cssText='border:1px solid #78d9b3;border-radius:5px;background:#173c33;color:#eafff2;padding:4px;font:11px system-ui';
 bar.append(title,expand,copy);
 const pre=document.createElement('pre');
 pre.style.cssText='display:none;max-height:36vh;overflow:auto;margin:8px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text';
 panel.append(bar,pre);document.body.append(panel);
 const trace=[];let shown=false,raf=0,disposed=false;
 const postInputTimers=new Set();
 const toNum=n=>Number.isFinite(n)?Math.round(n):'-';
 const snap=(event,target=null)=>{
  if(disposed)return;
  const g=game.getBoundingClientRect(),sl=slot?.getBoundingClientRect(),sh=sheet.getBoundingClientRect();
  const active=document.activeElement;
  const field=active&&sheet.contains(active)&&active.getBoundingClientRect?active.getBoundingClientRect():null;
  const t=toNum(performance.now());
  trace.push(`${t} ${event} | target=${tagFieldLocation(target,sheet)}, active=${tagFieldLocation(active,sheet)} | page=${toNum(window.scrollY)}, vvTop=${toNum(vv.offsetTop)}, vvH=${toNum(vv.height)}, winH=${toNum(window.innerHeight)} | slotTop=${toNum(sl?.top)}, gameTop=${toNum(g.top)}, gameH=${toNum(g.height)}, sheetTop=${toNum(sh.top)}, sheetH=${toNum(sh.height)}, sheetScroll=${toNum(sheet.scrollTop)}, sheetScrollMax=${toNum(Math.max(0,sheet.scrollHeight-sheet.clientHeight))}, fieldTop=${toNum(field?.top)}, fieldBottom=${toNum(field?.bottom)}, htmlScroll=${toNum(document.documentElement.scrollTop)}, vvPageTop=${toNum(vv.pageTop)}, gamePos=${getComputedStyle(game).position}, bodyPos=${getComputedStyle(document.body).position}`);
  if(trace.length>120)trace.shift();
  if(shown){pre.textContent=trace.slice(-32).join('\n');pre.scrollTop=pre.scrollHeight;}
 };
 const sample=(event,target=null)=>{
  snap(event,target);
  if(!raf)raf=requestAnimationFrame(()=>{raf=0;snap(event+':frame',target);});
 };
 // Capture the original touched column BEFORE the key's click handler
 // can redirect focus to the value input. Never preventDefault or focus.
 const onPointerDown=event=>{
  if(event.target instanceof Element&&event.target.closest('.komo-tag-row'))
   sample('pointerdown',event.target);
 };
 const onFocusIn=event=>{sample('focusin',event.target);};
 const onFocusOut=event=>{
  sample('focusout',event.target);
  for(const delay of [100,350,750,1500])
   setTimeout(()=>{if(!disposed)snap('after-done+'+delay);},delay);
  if(!shown){shown=true;pre.style.display='block';expand.textContent='閉じる';pre.textContent=trace.slice(-32).join('\n');}
 };
 const onWindowScroll=()=>sample('page-scroll');
 const onVVResize=()=>sample('vv-resize');
 const onVVScroll=()=>sample('vv-scroll');
 const onBeforeInput=()=>sample('beforeinput');
 const onInput=()=>{
  sample('input');
  // Record a short, read-only tail after each actual text edit. The
  // native scroll can occur *after* the input event in iOS WebKit.
  for(const timer of postInputTimers)clearTimeout(timer);
  postInputTimers.clear();
  for(const delay of [80,300,700]){
   const timer=setTimeout(()=>{
    postInputTimers.delete(timer);
    if(!disposed)snap('after-input+'+delay+'ms');
   },delay);
   postInputTimers.add(timer);
  }
 };
 const onCompositionStart=()=>sample('compositionstart');
 const onCompositionEnd=()=>sample('compositionend');
 expand.addEventListener('click',()=>{
  shown=!shown;pre.style.display=shown?'block':'none';
  expand.textContent=shown?'閉じる':'ログ表示';
  if(shown)pre.textContent=trace.slice(-32).join('\n');
 });
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(trace.join('\n'));copy.textContent='コピー済み';}
  catch{copy.textContent='コピー不可・スクショでOK';}
 });
 sheet.addEventListener('pointerdown',onPointerDown,true);
 sheet.addEventListener('focusin',onFocusIn);
 sheet.addEventListener('focusout',onFocusOut);
 sheet.addEventListener('beforeinput',onBeforeInput);
 sheet.addEventListener('input',onInput);
 sheet.addEventListener('compositionstart',onCompositionStart);
 sheet.addEventListener('compositionend',onCompositionEnd);
 window.addEventListener('scroll',onWindowScroll,{passive:true});
 vv.addEventListener('resize',onVVResize);
 vv.addEventListener('scroll',onVVScroll);
 snap('editor-open');
 return {destroy(){
  disposed=true;
  sheet.removeEventListener('pointerdown',onPointerDown,true);
  sheet.removeEventListener('focusin',onFocusIn);
  sheet.removeEventListener('focusout',onFocusOut);
  sheet.removeEventListener('beforeinput',onBeforeInput);
  sheet.removeEventListener('input',onInput);
  sheet.removeEventListener('compositionstart',onCompositionStart);
  sheet.removeEventListener('compositionend',onCompositionEnd);
  for(const timer of postInputTimers)clearTimeout(timer);
  postInputTimers.clear();
  window.removeEventListener('scroll',onWindowScroll);
  vv.removeEventListener('resize',onVVResize);
  vv.removeEventListener('scroll',onVVScroll);
  if(raf)cancelAnimationFrame(raf);
  panel.remove();
 }};
}
