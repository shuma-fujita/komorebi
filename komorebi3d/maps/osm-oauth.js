// Shared OAuth 2.0 Authorization Code + PKCE. No API writes or automatic login.
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
export function createOsmOAuth(environment,{loadClientId,configError,loginRequiredError}){
 const TOKEN_KEY=environment.tokenKey,AUTH_KEY=environment.authKey,ERROR_KEY=environment.errorKey;
 const redirectUri=()=>environment.redirectUri;
 if(!environment.origin||!environment.redirectUri||!TOKEN_KEY||!AUTH_KEY||!ERROR_KEY||new Set([TOKEN_KEY,AUTH_KEY,ERROR_KEY]).size!==3)throw Error('OSM OAuth環境設定が不正です。');
 function hasToken(){return !!scopedStorageGet(TOKEN_KEY);}
 function forgetToken(){scopedStorageRemove(TOKEN_KEY);}
 function consumeAuthError(){
  const msg=scopedStorageGet(ERROR_KEY)||'';scopedStorageRemove(ERROR_KEY);return msg;
 }
 function readToken(){const token=scopedStorageGet(TOKEN_KEY);if(!token)throw Error(loginRequiredError);return token;}
 async function startLogin(){
  // OAuth configuration is deliberately loaded only when login is requested.
  // A missing/stale configuration must never prevent the 3D game from booting.
  let id='';
  try{
   id=String(await loadClientId()||'').trim();
  }catch(_){throw Error('OAuth設定ファイルを取得できません。公開設定を確認し、ページを再読み込みしてください。');}
  if(!id||id.length>512)throw Error(configError);
  if(location.origin!==new URL(environment.redirectUri).origin)throw Error('OAuth認証は公開ゲーム画面 '+environment.redirectUri+' から開始してください。別のドメインでは認証情報を引き継げません。');
  if(!crypto?.subtle||!crypto?.getRandomValues)throw Error('このブラウザでは安全なPKCE認証を利用できません。');
  const verifier=randomUrlSafe(32),state=randomUrlSafe(24);
  const challenge=urlSafeBase64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  scopedStorageSet(AUTH_KEY,JSON.stringify({verifier,state,clientId:id,redirect:redirectUri()}));
  const url=new URL(environment.origin+'/oauth2/authorize');
  for(const [key,value] of Object.entries({response_type:'code',client_id:id,redirect_uri:redirectUri(),scope:'write_api',state,code_challenge:challenge,code_challenge_method:'S256'}))
   url.searchParams.set(key,value);
  location.assign(url.href);
 }
 async function finishLogin(){
  const params=new URLSearchParams(location.search);
  if(!params.has('code')&&!params.has('error'))return;
  const raw=scopedStorageGet(AUTH_KEY);
  // Do not interpret unrelated authorization codes.
  if(!raw)return;
  // Both environments share a callback URL. Only the matching state owns it.
  let session;
  try{session=JSON.parse(raw);}catch(_){return;}
  if(!session?.state||params.get('state')!==session.state)return;
  const clean=()=>{const next=new URL(location.href);for(const k of ['code','state','error','error_description'])next.searchParams.delete(k);history.replaceState(null,'',next.pathname+next.search+next.hash);};
  try{
   if(params.get('error'))throw Error('OAuth認証が中断されました: '+params.get('error'));
   if(!session?.state||params.get('state')!==session.state||session.redirect!==redirectUri())throw Error('OAuthのstate/リダイレクト照合に失敗しました。');
   const body=new URLSearchParams({grant_type:'authorization_code',code:params.get('code')||'',redirect_uri:session.redirect,client_id:session.clientId,code_verifier:session.verifier});
   const response=await fetch(environment.origin+'/oauth2/token',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
   if(!response.ok)throw Error('トークン取得失敗 HTTP '+response.status+': '+(await response.text()).slice(0,180));
   const data=await response.json();
   if(!data.access_token||(data.scope&&!String(data.scope).split(' ').includes('write_api')))throw Error('write_api 権限のトークンが取得できませんでした。');
   scopedStorageSet(TOKEN_KEY,data.access_token);
  }catch(error){scopedStorageSet(ERROR_KEY,String(error.message||error));}
  finally{scopedStorageRemove(AUTH_KEY);clean();}
 }
 return Object.freeze({hasToken,forgetToken,consumeAuthError,readToken,startLogin,finishLogin});
}
