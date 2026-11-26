// Common reviewed-tag validation and changeset writer. No UI or persistence.
import {buildOsmChangeComment,makeElementXmlWithTags} from './osm-xml.js?v=server-conflict-20261126';
export function prepareOsmTagWrite(item,review){
 const target={type:item?.type,id:String(item?.id??'')};
 if(!['node','way','relation'].includes(target.type)||!/^[1-9]\d*$/.test(target.id)||
    !review?.osm||review.osm.type!==target.type||String(review.osm.id)!==target.id||
    String(review.osm.version)!==String(item.version)||!/^[1-9]\d*$/.test(String(item.version)))
  throw Error('OSM対象またはversionが変更されました。編集内容を確認し直してください。');
 if(!review.tags||typeof review.tags!=='object'||Array.isArray(review.tags))throw Error('タグ一覧が不正です。');
 const tags=Object.create(null);
 for(const [key,value] of Object.entries(review.tags)){
  if(!key||/[\u0000-\u001f=]/.test(key)||typeof value!=='string')throw Error('タグ名または値が不正です。');
  tags[key]=value;
 }
 return {target,tags,comment:buildOsmChangeComment(item.tags,tags)};
}
export async function writeReviewedOsmTags({api,origin,item,prepared,source='',token,onCloseError,onUpdateStart,validateVersion=false}){
 const {target,tags,comment}=prepared;
 return api.withChangeset({comment,source,token,onCloseError},async changesetId=>{
  const xml=makeElementXmlWithTags(item,changesetId,tags);
  onUpdateStart?.(changesetId);
  const newVersion=await api.write('/'+target.type+'/'+target.id,xml,token);
  if(validateVersion&&(!/^[1-9]\d*$/.test(newVersion)||BigInt(newVersion)!==BigInt(item.version)+1n))throw Error('OSM更新結果のversionを確認できません。');
  return {changesetId,newVersion,elementUrl:origin+'/'+target.type+'/'+target.id};
 });
}
