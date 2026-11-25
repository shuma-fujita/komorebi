import {getOsmConfig} from './osm-config.js?v=osm-environments-20261125';
// OAuth 2.0 public client; each environment owns its session keys.
export function createOsmAuth(environment,loadClientId){
 const config=getOsmConfig(environment);
 const prefix='komorebi:osm-'+environment+':';
 const TOKEN_KEY=prefix+'token',AUTH_KEY=prefix+'oauth',ERROR_KEY=prefix+'error';
function randomUrlSafe(bytes=32){
 const data=new Uint8Array(bytes);
 crypto.getRandomValues(data);
 return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function urlSafeBase64(buffer){
 return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function scopedStorageGet(key){try{return sessionStorage.getItem(key);}catch(_){return null;}}
function scopedStorageSet(key,val){sessionStorage.setItem(key,val);}
function scopedStorageRemove(key){try{sessionStorage.removeItem(key);}catch(_){}}
function hasToken(){return !!scopedStorageGet(TOKEN_KEY);}
function forgetToken(){scopedStorageRemove(TOKEN_KEY);}
function consumeAuthError(){
 const msg=scopedStorageGet(ERROR_KEY)||'';scopedStorageRemove(ERROR_KEY);return msg;
}
function readToken(){const token=scopedStorageGet(TOKEN_KEY);if(!token)throw Error('先に対象のOSM環境でOAuth認証してください。');return token;}
async function startLogin(){
 // OAuth configuration is deliberately loaded only when login is requested.
 // A missing/stale configuration must never prevent the 3D game from booting.
 const id=String(await loadClientId()||'').trim();
 if(!id||id.length>512)throw Error('OSM OAuth設定が未完了です。');
 if(location.origin!==new URL(config.redirectUri).origin)throw Error('OAuth認証は公開ゲーム画面 '+config.redirectUri+' から開始してください。別のドメインでは認証情報を引き継げません。');
 if(!crypto?.subtle||!crypto?.getRandomValues)throw Error('このブラウザでは安全なPKCE認証を利用できません。');
 const verifier=randomUrlSafe(32),state=randomUrlSafe(24);
 const challenge=urlSafeBase64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
 scopedStorageSet(AUTH_KEY,JSON.stringify({verifier,state,clientId:id,redirect:config.redirectUri}));
 const url=new URL(config.oauthOrigin+'/oauth2/authorize');
 for(const [key,value] of Object.entries({response_type:'code',client_id:id,redirect_uri:config.redirectUri,scope:config.scope,state,code_challenge:challenge,code_challenge_method:'S256'}))
  url.searchParams.set(key,value);
 location.assign(url.href);
}
async function finishLogin(){
 const params=new URLSearchParams(location.search);
 if(!params.has('code')&&!params.has('error'))return;
 const raw=scopedStorageGet(AUTH_KEY);
 // Do not interpret unrelated authorization codes.
 if(!raw)return;
 // Only the environment that initiated this callback may consume it.
 const other=config.environment==='test'?'prod':'test';
 const otherRaw=scopedStorageGet('komorebi:osm-'+other+':oauth');
 if(otherRaw){try{if(JSON.parse(otherRaw).state===params.get('state'))return;}catch(_){}}
 const clean=()=>{const next=new URL(location.href);for(const k of ['code','state','error','error_description'])next.searchParams.delete(k);history.replaceState(null,'',next.pathname+next.search+next.hash);};
 try{
  const session=JSON.parse(raw);
  if(params.get('error'))throw Error('OAuth認証が中断されました: '+params.get('error'));
  if(!session?.state||params.get('state')!==session.state||session.redirect!==config.redirectUri)throw Error('OAuthのstate/リダイレクト照合に失敗しました。');
  const body=new URLSearchParams({grant_type:'authorization_code',code:params.get('code')||'',redirect_uri:session.redirect,client_id:session.clientId,code_verifier:session.verifier});
  const response=await fetch(config.oauthOrigin+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!response.ok)throw Error('トークン取得失敗 HTTP '+response.status+': '+(await response.text()).slice(0,180));
  const data=await response.json();
  if(!data.access_token||(data.scope&&!String(data.scope).split(' ').includes(config.scope)))throw Error('write_api 権限のトークンが取得できませんでした。');
  scopedStorageSet(TOKEN_KEY,data.access_token);
 }catch(error){scopedStorageSet(ERROR_KEY,String(error.message||error));}
 finally{scopedStorageRemove(AUTH_KEY);clean();}
}

 return Object.freeze({hasToken,forgetToken,consumeAuthError,readToken,startLogin,finishLogin});
}
