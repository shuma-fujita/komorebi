import {getOsmConfig} from './osm-config.js?v=osm-environments-20261125';
// Shared transport. Step 1 permits authenticated writes ONLY to TEST.
export function createOsmApi(environment){
 const config=getOsmConfig(environment);
 const base=config.apiOrigin+'/api/0.6';
 function endpoint(path){
  if(!/^\/(?:node|way|relation)\/[1-9]\d*(?:\/full)?$/.test(path)&&
     !/^\/changeset\/(?:create|[1-9]\d*\/(?:close|upload))$/.test(path))
   throw Error('Invalid OSM API path');
  return base+path;
 }
 async function read(path){
  return fetch(endpoint(path),{method:'GET',headers:{Accept:'application/xml'},cache:'no-store'});
 }
 async function write(path,body,token,method='PUT'){
  if(environment!=='test')throw Error('Production OSM writes are not enabled');
  if(!token)throw Error('Missing OSM token');
  if(!['PUT','POST'].includes(method))throw Error('Invalid OSM write method');
  return fetch(endpoint(path),{method,headers:{Authorization:'Bearer '+token,'Content-Type':'text/xml; charset=utf-8'},body,redirect:'error'});
 }
 return Object.freeze({read,write});
}
