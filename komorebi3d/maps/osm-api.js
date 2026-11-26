// Shared transport and changeset lifecycle. Only TEST writes are enabled.
import {OSM_TEST,OSM_PRODUCTION} from './osm-environments.js?v=step1a-20261126';
import {makeChangesetXml} from './osm-xml.js?v=step1e-20261126';
export function createOsmApi(environment){
 if(environment!==OSM_TEST&&environment!==OSM_PRODUCTION)throw Error('OSM API環境設定が不正です。');
 const api=environment.apiOrigin+'/api/0.6';
 function url(path){
  if(!/^\/(?:node|way|relation)\/[1-9]\d*(?:\/full)?$|^\/changeset\/(?:create|[1-9]\d*\/(?:close|upload))$/.test(path))throw Error('OSM APIパスが不正です。');
  return api+path;
 }
 async function read(path,errorMessage){
  const response=await fetch(url(path),{method:'GET',headers:{Accept:'application/xml'},cache:'no-store'});
  if(!response.ok)throw Error(errorMessage(response.status));
  return response.text();
 }
 async function write(path,body,token,{method='PUT',errorPrefix='テストAPI HTTP '}={}){
  if(environment!==OSM_TEST)throw Error('本番OSMへの書き込みは無効です。');
  if(!token)throw Error('OAuthトークンがありません。');
  if(method!=='PUT'&&method!=='POST')throw Error('OSM APIメソッドが不正です。');
  const response=await fetch(url(path),{method,redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'text/xml; charset=utf-8'},body});
  const content=await response.text();
  if(!response.ok)throw Error(errorPrefix+response.status+': '+content.slice(0,method==='POST'?240:250));
  return method==='POST'?content:content.trim();
 }
 async function withChangeset({comment,source='',token,onCloseError},action){
  let changesetId=null,uploaded=false;
  try{
   changesetId=await write('/changeset/create',makeChangesetXml(comment,source),token);
   if(!/^[1-9]\d*$/.test(changesetId))throw Error('変更セットIDが不正です。');
   const result=await action(changesetId);
   uploaded=true;
   return result;
  }finally{
   if(changesetId&&/^[1-9]\d*$/.test(changesetId)){
    try{await write('/changeset/'+changesetId+'/close','',token);}
    catch(error){onCloseError?.(error,uploaded);}
   }
  }
 }
 return Object.freeze({read,write,withChangeset});
}
