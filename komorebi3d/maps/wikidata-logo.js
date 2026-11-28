// Runtime-only Wikimedia logo resolver. One request and decoded image per Wikidata entity.
// Fail closed: the caller retains its bundled PNG on network/CORS/metadata errors.
// Report runtime stages without coupling the resolver to a panel or renderer.
export function reportWikidataLogoStage(id,stage,state,detail=''){
 if(typeof window==='undefined')return;
 const event=new CustomEvent('komorebi:wikidata-logo',{detail:{id,stage,state,detail:String(detail).slice(0,180)}});
 window.dispatchEvent(event);
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
  const pages=(await json(commons)).query?.pages||{};
  const info=Object.values(pages)[0]?.imageinfo?.[0];
  const url=info?.thumburl||info?.url;
  if(!url||!/^https:\/\/upload\.wikimedia\.org\//.test(url))throw Error('Unexpected Commons image URL');
  const image=await loadImage(url);
  reportWikidataLogoStage(id,'commons','success',image.naturalWidth+'×'+image.naturalHeight);
  return image;
 })().catch(error=>{
  reportWikidataLogoStage(id,'error','failed',error?.message||error);
  throw error;
 }));
 return pending.get(id);
}
