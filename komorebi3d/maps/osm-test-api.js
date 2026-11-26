// Development OSM server ONLY. Never use live OSM endpoints here.
// OAuth 2.0 Authorization Code + PKCE for a public browser application.
import {parseOsmElement,buildOsmChangeComment,makeChangesetXml as sharedChangesetXml,makeElementXmlWithTags} from './osm-xml.js?v=step1e-20261126';
import {createOsmApi} from './osm-api.js?v=step3-20261126';
export {buildOsmChangeComment};
import {OSM_TEST,OSM_PRODUCTION} from './osm-environments.js?v=step3-20261126';
import {createOsmOAuth} from './osm-oauth.js?v=step3-20261126';
export const OSM_TEST_ORIGIN=OSM_TEST.origin;
const testApi=createOsmApi(OSM_TEST);
const productionReadApi=createOsmApi(OSM_PRODUCTION);
const types=new Set(['node','way','relation']);
// OAuth application callback must be registered once at this exact public URL.
// Do not derive it from a launch URL, a route, or transient query parameters.
export const OSM_TEST_REDIRECT_URI=OSM_TEST.redirectUri;

// Keep the public TEST interface and existing session keys unchanged.
const testOAuth=createOsmOAuth(OSM_TEST,{
 loadClientId:async()=> (await import('./osm-test-client-config.js?v=lazy-oauth-config-20261121')).OSM_TEST_CLIENT_ID,
 configError:'KomorebiのOAuth設定が未完了です。管理者がGitHub Actions Secret「OSM_TEST_CLIENT_ID」を設定し、Pagesの公開元をGitHub Actionsへ切り替えてください。',
 loginRequiredError:'先にテストサーバーでOAuth認証してください。'
});
export const hasOsmTestToken=testOAuth.hasToken;
export const forgetOsmTestToken=testOAuth.forgetToken;
export const consumeOsmTestAuthError=testOAuth.consumeAuthError;
export const startOsmTestLogin=testOAuth.startLogin;
export const finishOsmTestLogin=testOAuth.finishLogin;
const readToken=testOAuth.readToken;
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
 const xml=await testApi.read('/'+type+'/'+id,status=>'テスト要素の取得失敗 HTTP '+status+'（本番OSMのIDは使えません）');
 return parseOsmElement(xml,type,id,'テスト');
}
export function makeChangesetXml(comment='Add verified shop floor level (development server only)',source=''){
 return sharedChangesetXml(comment,source);
}
// Only the reviewed TEST element and its exact version may be edited.
export async function sendOsmTestTags(item,review,source=''){
 const target=normalizeOsmTestTarget(item?.type,item?.id);
 if(!review?.osm||review.osm.type!==target.type||String(review.osm.id)!==target.id||
    String(review.osm.version)!==String(item.version)||!/^[1-9]\d*$/.test(String(item.version)))
  throw Error('テスト対象またはversionが変更されました。編集内容を確認し直してください。');
 if(!review.tags||typeof review.tags!=='object'||Array.isArray(review.tags))throw Error('タグ一覧が不正です。');
 const updatedTags=Object.create(null);
 for(const [key,value] of Object.entries(review.tags)){
  if(!key||/[\u0000-\u001f=]/.test(key)||typeof value!=='string')throw Error('タグ名または値が不正です。');
  updatedTags[key]=value;
 }
 const comment=buildOsmChangeComment(item.tags,updatedTags);
 const token=readToken();
 return testApi.withChangeset({comment,source,token,onCloseError:(error,uploaded)=>console.warn(uploaded?'OSM test changeset written but closing failed':'OSM test changeset close failed',error)},async changesetId=>{
  const newVersion=await testApi.write('/'+target.type+'/'+target.id,makeElementXmlWithTags(item,changesetId,updatedTags),token);
  return {changesetId,newVersion,elementUrl:OSM_TEST_ORIGIN+'/'+target.type+'/'+target.id};
 });
}

// Read the canonical public OSM element only; never authenticate or write to production.
export async function loadOsmCopySource(type,id){
 if(!['node','way'].includes(type)||!/^[1-9]\d*$/.test(String(id)))
  throw Error('コピーできるのは既存のnodeまたはwayだけです。relationには未対応です。');
 const xml=await productionReadApi.read('/'+type+'/'+id+(type==='way'?'/full':''),status=>'本番OSMからコピー元を取得できませんでした HTTP '+status);
 const documentXml=new DOMParser().parseFromString(xml,'application/xml');
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
 return testApi.withChangeset({comment:'Copy existing OSM feature for testing (development server only)',token,onCloseError:error=>console.warn('OSM test copy changeset close failed',error)},async changesetId=>{
  const body=await testApi.write('/changeset/'+changesetId+'/upload',buildCopyChangeXml(source,changesetId),token,{method:'POST',errorPrefix:'コピー作成に失敗 HTTP '});
  const result=new DOMParser().parseFromString(body,'application/xml');
  if(result.querySelector('parsererror')||result.documentElement?.tagName!=='diffResult')throw Error('テストサーバーのコピー結果が不正です。');
  const nodes=Array.from(result.documentElement.children).filter(el=>el.tagName===source.type);
  const created=nodes[nodes.length-1]?.getAttribute('new_id');
  if(!created||!/^[1-9]\d*$/.test(created))throw Error('テストサーバーから作成IDを取得できませんでした。重複作成しないよう履歴を確認してください。');
  return {type:source.type,id:created,changesetId,url:OSM_TEST_ORIGIN+'/'+source.type+'/'+created};
 });
}
