// Runtime-only Wikimedia logo resolver. One request and decoded image per Wikidata entity.
// Fail closed: the caller retains its bundled PNG on network/CORS/metadata errors.
// Report runtime stages without coupling the resolver to a panel or renderer.
export function reportWikidataLogoStage(id,stage,state,detail=''){
 if(typeof window==='undefined')return;
 const event=new CustomEvent('komorebi:wikidata-logo',{detail:{id,stage,state,detail:String(detail).slice(0,180)}});
 window.dispatchEvent(event);
}
const logoStages=new Map();
let logoImageUrl='';
function mountLogoCopyButton(panel){
 if(panel.querySelector('[data-wikidata-copy]'))return;
 const button=document.createElement('button');
 button.type='button';
 button.dataset.wikidataCopy='';
 button.textContent='📋 診断結果をコピー';
 button.style.cssText='display:block;margin-top:8px;padding:7px 12px;border-radius:7px;border:1px solid #799781;background:#e2eddf;color:#20302a;font-weight:700;cursor:pointer';
 const feedback=document.createElement('span');
 feedback.setAttribute('aria-live','polite');
 feedback.style.cssText='display:block;margin-top:4px';
 button.addEventListener('click',async()=>{
  const content=panel.querySelector('[data-wikidata-diagnostic]');
  const result=[...(content?.children||[])].map(child=>child.textContent.trim()).filter(Boolean).join('\n');
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(result);
   else{
    const input=document.createElement('textarea');input.value=result;
    input.style.cssText='position:fixed;left:-9999px;top:0';
    document.body.append(input);input.select();
    const ok=document.execCommand('copy');input.remove();
    if(!ok)throw Error('コピーできませんでした');
   }
   feedback.textContent='コピーしました';
  }catch(error){feedback.textContent='コピー失敗：'+(error?.name||'UnknownError')+'。長押しで診断文を選択してください。';}
 });
 panel.append(button,feedback);
}

function renderLogoDiagnostic(){
 const panel=typeof document!=='undefined'?document.getElementById('wikidata-logo-status'):null;
 if(!panel)return;
 const stage=key=>{
  const value=logoStages.get(key);
  return value?value.state==='loading'?'取得中':value.state==='success'?'成功'+(value.detail?' ('+value.detail+')':''):value.state==='failed'?'失敗 ('+value.detail+')':value.state==='cancelled'?'中断（再生成）':'待機中':'待機中';
 };
 const error=logoStages.get('error');
 const escape=value=>String(value).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
 let content=panel.querySelector('[data-wikidata-diagnostic]');
 if(!content){
  content=document.createElement('div');
  content.dataset.wikidataDiagnostic='';
  panel.prepend(content);
 }
 content.innerHTML='<strong>🖼️ Wikidataロゴ診断（実測）</strong>'+
  '<div>対象：McDonald’s / Q38076</div>'+
  '<div>Wikidata：'+escape(stage('wikidata'))+' ・ P154：'+escape(stage('p154'))+'</div>'+
  '<div>Commons：'+escape(stage('commons'))+' ・ テクスチャ：A '+escape(stage('A'))+' / B '+escape(stage('B'))+'</div>'+ 
  '<div>取得ロゴURL：'+(logoImageUrl?'<a href="'+escape(logoImageUrl)+'" target="_blank" rel="noopener noreferrer" style="overflow-wrap:anywhere">'+escape(logoImageUrl)+'</a>':'未取得')+'</div>'+
  '<div>'+(error?'PNGフォールバック：'+escape(error.detail):'取得処理：'+(logoStages.size?'実行中／結果表示':'対象ロゴの描画待ち'))+'</div>';
 mountLogoCopyButton(panel);
}
if(typeof window!=='undefined')window.addEventListener('komorebi:wikidata-logo',event=>{
 const {id,stage,state,detail}=event.detail||{};
 if(id!=='Q38076'||!stage)return;
 logoStages.set(stage,{state,detail});
 renderLogoDiagnostic();
});
if(typeof document!=='undefined'){
 const panel=document.getElementById('wikidata-logo-status');
 if(panel){
  const content=document.createElement('div');
  content.dataset.wikidataDiagnostic='';
  while(panel.firstChild)content.append(panel.firstChild);
  panel.append(content);
  mountLogoCopyButton(panel);
 }
}
const pending=new Map();
function rankStatement(statement,now){
 if(statement.rank==='deprecated'||statement.mainsnak?.snaktype!=='value')return -1;
 const qualifiers=statement.qualifiers||{};
 const timestamp=snak=>Date.parse(snak?.datavalue?.value?.time?.replace(/^\+/,'')||'');
 const starts=(qualifiers.P580||[]).map(timestamp).filter(Number.isFinite);
 const ends=(qualifiers.P582||[]).map(timestamp).filter(Number.isFinite);
 if(starts.length&&Math.min(...starts)>now)return -1;
 if(ends.length&&Math.max(...ends)<now)return -1;
 return (statement.rank==='preferred'?100:0)+(starts.length?10:0)+(starts.length?Math.max(...starts)/1e14:0);
}
export function selectWikidataLogoFile(entity,now=Date.now()){
 return (entity?.claims?.P154||[]).map((s,i)=>({s,i,score:rankStatement(s,now)}))
  .filter(x=>x.score>=0&&typeof x.s.mainsnak?.datavalue?.value==='string')
  .sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.s.mainsnak.datavalue.value??null;
}
async function json(url){
 const response=await fetch(url,{mode:'cors',credentials:'omit'});
 if(!response.ok)throw Error('Wikimedia HTTP '+response.status);
 return response.json();
}
function loadImage(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.crossOrigin='anonymous';image.decoding='async';
  image.onload=()=>image.naturalWidth&&image.naturalHeight?resolve(image):reject(Error('Empty Wikimedia logo'));
  image.onerror=()=>reject(Error('Wikimedia image CORS/load failed'));
  image.src=url;
 });
}
export function loadWikidataLogo(id){
 if(!/^Q[1-9]\d*$/.test(id))return Promise.reject(Error('Invalid Wikidata id'));
 if(!pending.has(id))pending.set(id,(async()=>{
  reportWikidataLogoStage(id,'wikidata','loading');
  const api='https://www.wikidata.org/w/api.php?origin=*&format=json&action=wbgetentities&props=claims&ids='+encodeURIComponent(id);
  const entity=(await json(api)).entities?.[id];
  if(!entity)throw Error('Wikidata entity missing');
  reportWikidataLogoStage(id,'wikidata','success');
  reportWikidataLogoStage(id,'p154','loading');
  const filename=selectWikidataLogoFile(entity);
  if(!filename)throw Error('Wikidata P154 missing');
  reportWikidataLogoStage(id,'p154','success',filename);
  reportWikidataLogoStage(id,'commons','loading');
  const commons='https://commons.wikimedia.org/w/api.php?origin=*&format=json&action=query&prop=imageinfo&iiprop=url&iiurlwidth=512&titles='+encodeURIComponent('File:'+filename);
  const result=await json(commons);
  const pages=Object.values(result.query?.pages||{});
  const page=pages.find(p=>p.imageinfo?.length)||pages[0];
  const info=page?.imageinfo?.[0];
  const url=info?.thumburl||info?.url;
  if(!url){
   const reason=result.error?.info||result.warnings?.query?.['*']||
    (page?.missing!==undefined?'Commons file missing: '+filename:
     'Commons imageinfo URL missing');
   throw Error(String(reason).slice(0,180));
  }
  let parsed;
  try{parsed=new URL(url);}catch{throw Error('Invalid Commons image URL');}
  if(parsed.protocol!=='https:'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(parsed.hostname))
   throw Error('Unexpected Commons image host: '+parsed.hostname);
  logoImageUrl=parsed.href;
  renderLogoDiagnostic();
  const image=await loadImage(parsed.href);
  reportWikidataLogoStage(id,'commons','success',image.naturalWidth+'×'+image.naturalHeight);
  return image;
 })().catch(error=>{
  reportWikidataLogoStage(id,'error','failed',error?.message||error);
  throw error;
 }));
 return pending.get(id);
}
