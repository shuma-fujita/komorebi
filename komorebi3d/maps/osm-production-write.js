// Internal production writer. Not imported by the game UI in Step 4.
import {OSM_PRODUCTION} from './osm-environments.js?v=step3-20261126';
import {createOsmApi} from './osm-api.js?v=step4-20261126';
import {readOsmProductionToken,forgetOsmProductionToken} from './osm-production-auth.js?v=step4-20261126';
import {parseOsmElement} from './osm-xml.js?v=server-conflict-20261126';
import {prepareOsmTagWrite,writeReviewedOsmTags} from './osm-tag-writer.js?v=server-result-20261126';
const api=createOsmApi(OSM_PRODUCTION,{enableProductionWrites:true});
const uncertain=new Map();
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const same=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>own(b,k)&&a[k]===b[k]);
function failure(code,message,details={}){
 return Object.assign(Error(message),{code,...details});
}
function copyTags(tags){
 if(!tags||typeof tags!=='object'||Array.isArray(tags))throw failure('review_required','タグ情報を確認し直してください。');
 const copy=Object.create(null);
 for(const [k,v] of Object.entries(tags)){
  if(!k||/[\u0000-\u001f=]/.test(k)||typeof v!=='string')throw failure('review_required','タグ名または値が不正です。');
  copy[k]=v;
 }
 return copy;
}
// review.originalTags must be the exact snapshot that the user reviewed, not a refreshed baseline.
export async function sendOsmProductionTags(review,source=''){
 const osm={type:review?.osm?.type,id:String(review?.osm?.id??''),version:String(review?.osm?.version??'')};
 if(!['node','way','relation'].includes(osm.type)||!/^[1-9]\d*$/.test(osm.id)||!/^[1-9]\d*$/.test(osm.version))throw failure('review_required','本番OSMの対象・versionを確認し直してください。');
 const key=osm.type+'/'+osm.id;
 if(uncertain.has(key))throw failure('uncertain','前回の送信結果が未確認です。OSMの編集履歴を確認してください。',uncertain.get(key));
 const originalTags=copyTags(review.originalTags),tags=copyTags(review.tags);
 if(same(originalTags,tags))throw failure('no_changes','変更されたOSMタグがありません。');
 const changes=Object.create(null);
 for(const k of new Set([...Object.keys(originalTags),...Object.keys(tags)])){
  if(!own(tags,k))changes[k]=null;
  else if(!own(originalTags,k)||originalTags[k]!==tags[k])changes[k]=tags[k];
 }
 if(!review.changes||!same(changes,review.changes))throw failure('review_required','確認済みの差分とタグ一覧が一致しません。');
 let token;
 try{token=readOsmProductionToken();}catch(_){throw failure('auth_required','本番OSMでOAuth認証してください。');}
 let updateChangeset=null,closeWarning=null;
 try{
  const xml=await api.read('/'+key,status=>'本番OSMの取得失敗 HTTP '+status);
  const current=parseOsmElement(xml,osm.type,osm.id,'本番');
  // Geometry comes from the fetched element. The version and baseline must
  // remain those of the reviewed draft; OSM alone decides version conflicts.
  const item={...current,version:osm.version,tags:originalTags};
  const prepared=prepareOsmTagWrite(item,{osm,tags});
  const result=await writeReviewedOsmTags({api,origin:OSM_PRODUCTION.origin,item,prepared,source,token,
   onUpdateStart:id=>{updateChangeset=id;},
   onCloseError:error=>{closeWarning=String(error.message||error);}
  });
  return {...result,type:osm.type,id:osm.id,version:result.newVersion,changes,closeWarning};
 }catch(error){
  const status=error.status;
  if(status===401){forgetOsmProductionToken();throw failure('auth_required','本番OSMの認証が切れました。再認証してください。',{status});}
  if(status===409||status===412||status===404||status===410)throw failure('conflict','本番OSMの対象またはversionが変更されました。最新データを確認してください。',{status});
  if(updateChangeset&&(!status||status>=500)){
   const details={changesetId:updateChangeset,elementUrl:OSM_PRODUCTION.origin+'/'+key,changesetUrl:OSM_PRODUCTION.origin+'/changeset/'+updateChangeset,closeWarning};
   uncertain.set(key,details);
   throw failure('uncertain','送信結果が不明です。再送信せずOSMの編集履歴を確認してください。',details);
  }
  throw error;
 }
}
