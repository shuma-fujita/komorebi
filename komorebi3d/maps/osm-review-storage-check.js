// LocalStorage smoke-check controls for an unsent tag review.
// Test-only namespace: NEVER create a confirmed-production pending OSM record.
// This helper is reusable by the mock and (after UI approval) the game.
const TEST_PREFIX='komorebi3d:osm-review-storage-check:v1:';
const TYPES=new Set(['node','way','relation']);

function reviewKey(review){
 const osm=review?.osm;
 const id=String(osm?.id??'');
 if(!TYPES.has(osm?.type)||!/^[1-9]\d*$/.test(id))
  throw Error('OSM要素のIDが不正です。');
 return TEST_PREFIX+osm.type+'/'+id;
}
function testPayload(review){
 const key=reviewKey(review);
 const changes=review?.changes;
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length)
  throw Error('保存できる変更内容がありません。');
 return {key,payload:JSON.stringify({
  type:review.osm.type,id:String(review.osm.id),version:review.osm.version??null,
  changes
 })};
}
export function saveOsmReviewStorageCheck(review){
 const {key,payload}=testPayload(review);
 localStorage.setItem(key,payload);
 if(localStorage.getItem(key)!==payload)throw Error('保存内容を読み取れません。');
 return key;
}
export function releaseOsmReviewStorageCheck(review){
 const key=reviewKey(review);
 localStorage.removeItem(key);
 if(localStorage.getItem(key)!==null)throw Error('保存データを開放できません。');
 return key;
}
// Insert at the TOP of the confirmation UI. getReview returns only a
// currently displayed draft, never a production save-success callback.
export function prependOsmReviewStorageCheck(reviewPanel,{getReview}={}){
 if(typeof getReview!=='function')throw Error('確認データの取得処理がありません。');
 const section=document.createElement('section');
 section.className='komo-review-storage-check';
 section.style.cssText='padding:10px 9px;margin:0 0 13px;background:rgba(255,176,68,.08);border:1px solid rgba(255,189,98,.65);border-radius:11px;';
 const heading=document.createElement('strong');
 heading.textContent='動作確認用｜localStorage';
 heading.style.cssText='display:block;margin:0 0 8px;color:#ffdf9d;font:700 12px/1.5 system-ui,-apple-system,sans-serif;';
 const buttons=document.createElement('div');
 buttons.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;';
 const makeButton=(text)=>{
  const button=document.createElement('button');button.type='button';button.textContent=text;
  button.style.cssText='min-width:0;min-height:49px;padding:9px 6px;border:1.5px solid #ffbd62;border-radius:9px;background:#483822;color:#ffe4ae;font:700 12px/1.35 system-ui,-apple-system,sans-serif;white-space:normal;overflow-wrap:anywhere;touch-action:manipulation;cursor:pointer;';
  return button;
 };
 const save=makeButton('ローカルストレージに保存');
 const release=makeButton('ローカルストレージ開放');
 const status=document.createElement('p');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.style.cssText='min-height:1em;margin:8px 0 0;color:#ffd08a;font:11px/1.5 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere;';
 const help=document.createElement('p');
 help.style.cssText='margin:7px 0 0;color:#b8cabe;font:10px/1.5 system-ui,-apple-system,sans-serif;';
 help.textContent='保存・開放は動作確認専用。OSM本番への送信やGeofabrik反映待ちの正式記録にはなりません。';
 const invoke=(action,okText)=>{
  try{
   action(getReview());
   status.textContent=okText;
   status.style.color='#d0f6c7';
  }catch(error){
   status.textContent='⚠ '+String(error?.message||error);
   status.style.color='#ffd08a';
  }
 };
 save.addEventListener('click',()=>invoke(saveOsmReviewStorageCheck,'✅ 動作確認用データをlocalStorageへ保存しました。'));
 release.addEventListener('click',()=>invoke(releaseOsmReviewStorageCheck,'✅ 動作確認用データをlocalStorageから開放しました。'));
 buttons.append(save,release);
 section.append(heading,buttons,status,help);
 reviewPanel.prepend(section);
 return {section,clearStatus(){status.textContent='';}};
}
