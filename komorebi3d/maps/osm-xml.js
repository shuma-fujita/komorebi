// Shared XML and changeset metadata helpers. No network access.
import {buildOsmChangesetTags} from './osm-changeset-tags.js?v=komorebi-builder-20261122';
export function parseOsmElement(xml,type,id,label='OSM'){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw Error('OSMから受信したXMLの解析に失敗しました。');
 const root=doc.documentElement,element=root?.querySelector(type);
 if(root?.tagName!=='osm'||!element||element.getAttribute('id')!==String(id))throw Error('指定した'+label+'要素が見つかりません。');
 const version=element.getAttribute('version');
 if(!version)throw Error(label+'要素のversionが取得できません。');
 const tags=Object.create(null);
 for(const tag of element.children)if(tag.tagName==='tag')tags[tag.getAttribute('k')]=tag.getAttribute('v');
 return {type,id:String(id),version,tags,element};
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
export function makeChangesetXml(comment,source=''){
 const doc=document.implementation.createDocument(null,'osm',null);
 doc.documentElement.setAttribute('version','0.6');
 const changeset=doc.createElement('changeset');doc.documentElement.appendChild(changeset);
 for(const [key,value] of Object.entries(buildOsmChangesetTags(comment,source))){
  const tag=doc.createElement('tag');tag.setAttribute('k',key);tag.setAttribute('v',value);changeset.appendChild(tag);
 }
 return new XMLSerializer().serializeToString(doc);
}
export function makeElementXmlWithTags(item,changesetId,tags){
 const doc=document.implementation.createDocument(null,'osm',null);doc.documentElement.setAttribute('version','0.6');
 const element=doc.createElement(item.type);
 for(const key of ['id','version','lat','lon','visible']){
  const value=item.element.getAttribute(key);if(value!=null)element.setAttribute(key,value);
 }
 element.setAttribute('changeset',changesetId);
 for(const child of item.element.children){
  if(!['nd','member'].includes(child.tagName))continue;
  const clone=doc.importNode(child,true);
  element.appendChild(clone);
 }
 for(const [key,value] of Object.entries(tags)){
  const tag=doc.createElement('tag');tag.setAttribute('k',key);tag.setAttribute('v',String(value));element.appendChild(tag);
 }
 doc.documentElement.appendChild(element);
 return new XMLSerializer().serializeToString(doc);
}
