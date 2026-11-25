// Development OSM server ONLY. Never use live OSM endpoints here.
// OAuth 2.0 Authorization Code + PKCE for a public browser application.
import {buildOsmChangesetTags} from './osm-changeset-tags.js?v=komorebi-builder-20261122';
import {getOsmConfig} from './osm-config.js?v=osm-environments-20261125';
import {createOsmAuth} from './osm-auth.js?v=osm-environments-20261125';
import {createOsmApi} from './osm-api.js?v=osm-environments-20261125';
const testConfig=getOsmConfig('test');
export const OSM_TEST_ORIGIN=testConfig.webOrigin;
const testApi=createOsmApi('test');
const prodApi=createOsmApi('prod');
const auth=createOsmAuth('test',async()=>{
 let id='';
 try{
  const config=await import('./osm-test-client-config.js?v=lazy-oauth-config-20261121');
  id=String(config.OSM_TEST_CLIENT_ID||'').trim();
 }catch(_){throw Error('OAuth設定ファイルを取得できません。公開設定を確認し、ページを再読み込みしてください。');}
 if(!id||id.length>512)throw Error('KomorebiのOAuth設定が未完了です。管理者がGitHub Actions Secret「OSM_TEST_CLIENT_ID」を設定し、Pagesの公開元をGitHub Actionsへ切り替えてください。');
 return id;
});
export const hasOsmTestToken=auth.hasToken;
export const forgetOsmTestToken=auth.forgetToken;
export const consumeOsmTestAuthError=auth.consumeAuthError;
export const startOsmTestLogin=auth.startLogin;
export const finishOsmTestLogin=auth.finishLogin;
const readToken=auth.readToken;
const types=new Set(['node','way','relation']);
const facilities=['shop','amenity','office','tourism','healthcare','leisure'];
// OAuth application callback must be registered once at this exact public URL.
// Do not derive it from a launch URL, a route, or transient query parameters.
export const OSM_TEST_REDIRECT_URI=testConfig.redirectUri;

function parseOsmElement(xml,type,id){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw Error('OSMから受信したXMLの解析に失敗しました。');
 const root=doc.documentElement,element=root?.querySelector(type);
 if(root?.tagName!=='osm'||!element||element.getAttribute('id')!==String(id))throw Error('指定したテスト要素が見つかりません。');
 const version=element.getAttribute('version');
 if(!version)throw Error('テスト要素のversionが取得できません。');
 const tags={};
 for(const tag of element.children)if(tag.tagName==='tag')tags[tag.getAttribute('k')]=tag.getAttribute('v');
 return {type,id:String(id),version,tags,element};
}
export function normalizeOsmTestTarget(type,input){
 let kind=String(type||'').trim(),id=String(input||'').trim();
 // Accept numeric IDs, node/123, and test-server element URLs.
 const urlMatch=/^https:\/\/master\.apis\.dev\.openstreetmap\.org\/(node|way|relation)\/([1-9]\d*)(?:[/?#].*)?$/i.exec(id);
 const shortMatch=/^(node|way|relation)\s*\/\s*([1-9]\d*)$/i.exec(id);
 const match=urlMatch||shortMatch;
 if(match){kind=match[1].toLowerCase();id=match[2];}
 if(!types.has(kind)||!/^[1-9]\d*$/.test(id))throw Error('テスト要素の種別とIDを確認してください。例：node / 4365808698（数字のみでも入力できます）');
 return {type:kind,id};
}
export async function getOsmTestElement(type,id){
 const target=normalizeOsmTestTarget(type,id);
 type=target.type;id=target.id;
 const response=await testApi.read('/'+type+'/'+id);
 if(!response.ok)throw Error('テスト要素の取得失敗 HTTP '+response.status+'（本番OSMのIDは使えません）');
 return parseOsmElement(await response.text(),type,id);
}
export function validateOsmTestLevelTarget(element){
 if(!facilities.some(key=>element.tags[key]))throw Error('テスト対象に店舗・施設のタグがありません。建物そのものには階数を追加しません。');
 if(Object.prototype.hasOwnProperty.call(element.tags,'level'))throw Error('テスト対象には既にlevelタグがあります。未登録の店舗だけ編集できます。');
}
async function apiWrite(path,body,token){
 const response=await testApi.write(path,body,token);
 const content=await response.text();
 if(!response.ok)throw Error('テストAPI HTTP '+response.status+': '+content.slice(0,250));
 return content.trim();
}
// Generate a changeset comment from actual tag differences; no user-facing comment UI.
export function buildOsmChangeComment(before,after){
 const oldTags=before||{},newTags=after||{};
 const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
 const actions=[];
 for(const key of new Set([...Object.keys(oldTags),...Object.keys(newTags)])){
  const was=own(oldTags,key),now=own(newTags,key);
  if(was&&now&&String(oldTags[key])===String(newTags[key]))continue;
  if(!was&&now)actions.push({verb:'add',detail:key+' : '+String(newTags[key])});
  else if(was&&!now)actions.push({verb:'delete',detail:key});
  else if(was&&now)actions.push({verb:'update',detail:key+' : '+String(oldTags[key])+' → '+String(newTags[key])});
 }
 if(!actions.length)throw Error('変更されたOSMタグがありません。');
 const width=actions.length===1?0:Math.max(...actions.map(a=>a.verb.length));
 return actions.map(a=>(width?a.verb.padEnd(width,' '):a.verb)+' - '+a.detail).join('\n');
}
export function makeChangesetXml(comment='Add verified shop floor level (development server only)',source=''){
 const doc=document.implementation.createDocument(null,'osm',null);
 doc.documentElement.setAttribute('version','0.6');
 const changeset=doc.createElement('changeset');doc.documentElement.appendChild(changeset);
 for(const [key,value] of Object.entries(buildOsmChangesetTags(comment,source))){
  const tag=doc.createElement('tag');tag.setAttribute('k',key);tag.setAttribute('v',value);changeset.appendChild(tag);
 }
 return new XMLSerializer().serializeToString(doc);
}
function makeElementXml(item,changesetId,level){
 const doc=document.implementation.createDocument(null,'osm',null);doc.documentElement.setAttribute('version','0.6');
 const element=doc.createElement(item.type);
 for(const key of ['id','version','lat','lon','visible']){
  const value=item.element.getAttribute(key);if(value!=null)element.setAttribute(key,value);
 }
 element.setAttribute('changeset',changesetId);
 for(const child of item.element.children){
  if(!['tag','nd','member'].includes(child.tagName))continue;
  const clone=doc.importNode(child,true);
  element.appendChild(clone);
 }
 const tag=doc.createElement('tag');tag.setAttribute('k','level');tag.setAttribute('v',String(level));element.appendChild(tag);
 doc.documentElement.appendChild(element);
 return new XMLSerializer().serializeToString(doc);
}
// A send uses the exact version loaded for preview. Stale version => API 409.
export async function sendOsmTestLevel(item,level,source=''){
 const value=Number(level);
 if(!Number.isInteger(value)||value<0||value>8)throw Error('1〜9階の階数を指定してください。');
 validateOsmTestLevelTarget(item);
 const token=readToken();
 let changesetId=null,uploaded=false;
 try{
  const updatedTags={...item.tags,level:String(value)};
  const comment=buildOsmChangeComment(item.tags,updatedTags);
  changesetId=await apiWrite('/changeset/create',makeChangesetXml(comment,source),token);
  if(!/^[1-9]\d*$/.test(changesetId))throw Error('変更セットIDが不正です。');
  const newVersion=await apiWrite('/'+item.type+'/'+item.id,makeElementXml(item,changesetId,value),token);
  uploaded=true;
  return {changesetId,newVersion,elementUrl:OSM_TEST_ORIGIN+'/'+item.type+'/'+item.id};
 }finally{
  if(changesetId&&/^[1-9]\d*$/.test(changesetId)){
   try{await apiWrite('/changeset/'+changesetId+'/close','',token);}
   catch(error){if(!uploaded)console.warn('OSM test changeset close failed',error);else console.warn('OSM test changeset written but closing failed',error);}
  }
 }
}


// Read the canonical public OSM element only; never authenticate or write to production.
export async function loadOsmCopySource(type,id){
 if(!['node','way'].includes(type)||!/^[1-9]\d*$/.test(String(id)))
  throw Error('コピーできるのは既存のnodeまたはwayだけです。relationには未対応です。');
 const response=await prodApi.read('/'+type+'/'+id+(type==='way'?'/full':''));
 if(!response.ok)throw Error('本番OSMからコピー元を取得できませんでした HTTP '+response.status);
 const documentXml=new DOMParser().parseFromString(await response.text(),'application/xml');
 if(documentXml.querySelector('parsererror')||documentXml.documentElement?.tagName!=='osm')
  throw Error('本番OSMから受け取ったXMLが不正です。');
 const element=Array.from(documentXml.documentElement.children).find(el=>el.tagName===type&&el.getAttribute('id')===String(id));
 if(!element||element.getAttribute('visible')==='false')throw Error('コピー元の要素がありません。');
 const tags={};
 for(const tag of element.children)if(tag.tagName==='tag')tags[tag.getAttribute('k')]=tag.getAttribute('v');
 if(!Object.keys(tags).length)throw Error('タグのない要素はコピーしません。');
 if(type==='node'){
  const lat=Number(element.getAttribute('lat')),lon=Number(element.getAttribute('lon'));
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('ノードの座標が不正です。');
  return {type,id:String(id),tags,points:[{lat,lon}],nodes:1};
 }
 const refs=Array.from(element.children).filter(child=>child.tagName==='nd').map(nd=>nd.getAttribute('ref'));
 if(refs.length<2||refs.length>150)throw Error('輪郭ノードが2〜150個のwayだけコピーできます。');
 const byId=new Map(Array.from(documentXml.documentElement.children).filter(el=>el.tagName==='node').map(el=>[el.getAttribute('id'),el]));
 const unique=[],nodes=new Map();
 for(const ref of refs){
  if(!ref||!byId.has(ref))throw Error('建物の輪郭に必要なノードが見つかりません。');
  if(!nodes.has(ref)){
   const el=byId.get(ref),lat=Number(el.getAttribute('lat')),lon=Number(el.getAttribute('lon'));
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('建物の輪郭に不正な座標があります。');
   nodes.set(ref,{lat,lon});unique.push(ref);
  }
 }
 if(unique.length<2||unique.length>149)throw Error('輪郭ノード数が多すぎるか少なすぎます。');
 return {type,id:String(id),tags,points:refs.map(ref=>nodes.get(ref)),refs,unique,coordinates:nodes,nodes:unique.length};
}
function buildCopyChangeXml(source,changesetId){
 const doc=document.implementation.createDocument(null,'osmChange',null);
 const root=doc.documentElement;root.setAttribute('version','0.6');root.setAttribute('generator','Komorebi 3D test copy');
 const create=doc.createElement('create');root.appendChild(create);
 const appendTags=parent=>{
  for(const [k,v] of Object.entries(source.tags)){
   const tag=doc.createElement('tag');tag.setAttribute('k',k);tag.setAttribute('v',String(v));parent.appendChild(tag);
  }
 };
 if(source.type==='node'){
  const node=doc.createElement('node');node.setAttribute('id','-1');node.setAttribute('changeset',changesetId);
  node.setAttribute('lat',String(source.points[0].lat));node.setAttribute('lon',String(source.points[0].lon));
  appendTags(node);create.appendChild(node);
 }else{
  const ids=new Map();
  for(const [index,ref] of source.unique.entries()){
   const id=String(-index-1);ids.set(ref,id);
   const {lat,lon}=source.coordinates.get(ref);
   const node=doc.createElement('node');
   node.setAttribute('id',id);node.setAttribute('changeset',changesetId);
   node.setAttribute('lat',String(lat));node.setAttribute('lon',String(lon));
   create.appendChild(node);
  }
  const way=doc.createElement('way');way.setAttribute('id',String(-source.unique.length-1));way.setAttribute('changeset',changesetId);
  for(const ref of source.refs){const nd=doc.createElement('nd');nd.setAttribute('ref',ids.get(ref));way.appendChild(nd);}
  appendTags(way);create.appendChild(way);
 }
 return new XMLSerializer().serializeToString(doc);
}
export async function createOsmTestCopy(source){
 if(!source||!['node','way'].includes(source.type)||!source.id||!source.tags||!source.points?.length)
  throw Error('有効なコピー元データがありません。');
 const token=readToken();
 let changesetId=null;
 try{
  changesetId=await apiWrite('/changeset/create',makeChangesetXml('Copy existing OSM feature for testing (development server only)'),token);
  if(!/^[1-9]\d*$/.test(changesetId))throw Error('変更セットIDが不正です。');
  const response=await testApi.write('/changeset/'+changesetId+'/upload',buildCopyChangeXml(source,changesetId),token,'POST');
  const body=await response.text();
  if(!response.ok)throw Error('コピー作成に失敗 HTTP '+response.status+': '+body.slice(0,240));
  const result=new DOMParser().parseFromString(body,'application/xml');
  if(result.querySelector('parsererror')||result.documentElement?.tagName!=='diffResult')throw Error('テストサーバーのコピー結果が不正です。');
  const nodes=Array.from(result.documentElement.children).filter(el=>el.tagName===source.type);
  const created=nodes[nodes.length-1]?.getAttribute('new_id');
  if(!created||!/^[1-9]\d*$/.test(created))throw Error('テストサーバーから作成IDを取得できませんでした。重複作成しないよう履歴を確認してください。');
  return {type:source.type,id:created,changesetId,url:OSM_TEST_ORIGIN+'/'+source.type+'/'+created};
 }finally{
  if(changesetId&&/^[1-9]\d*$/.test(changesetId)){
   try{await apiWrite('/changeset/'+changesetId+'/close','',token);}
   catch(e){console.warn('OSM test copy changeset close failed',e);}
  }
 }
}
