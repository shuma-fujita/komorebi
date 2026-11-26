// Production OAuth only. No map-writing API is exposed here.
import {OSM_PRODUCTION} from './osm-environments.js?v=step3-20261126';
import {createOsmOAuth} from './osm-oauth.js?v=step3-20261126';
const oauth=createOsmOAuth(OSM_PRODUCTION,{
 loadClientId:async()=> (await import('./osm-production-client-config.js?v=step3-20261126')).OSM_PRODUCTION_CLIENT_ID,
 configError:'本番OSMのOAuth設定が未完了です。管理者がGitHub Actions Secret「OSM_PRODUCTION_CLIENT_ID」を設定してください。',
 loginRequiredError:'先に本番OSMでOAuth認証してください。'
});
export const hasOsmProductionToken=oauth.hasToken;
export const forgetOsmProductionToken=oauth.forgetToken;
export const consumeOsmProductionAuthError=oauth.consumeAuthError;
export const startOsmProductionLogin=oauth.startLogin;
export const finishOsmProductionLogin=oauth.finishLogin;
