// Fixed OSM endpoints. Never derive an API destination from user input.
const redirectUri='https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html';
const testOrigin='https://master.apis.dev.openstreetmap.org';
const prodWebOrigin='https://www.openstreetmap.org';
export const OSM_CONFIG=Object.freeze({
 test:Object.freeze({environment:'test',webOrigin:testOrigin,oauthOrigin:testOrigin,apiOrigin:testOrigin,redirectUri,scope:'write_api'}),
 prod:Object.freeze({environment:'prod',webOrigin:prodWebOrigin,oauthOrigin:prodWebOrigin,apiOrigin:'https://api.openstreetmap.org',redirectUri,scope:'write_api'})
});
export function getOsmConfig(environment){
 if(environment!=='test'&&environment!=='prod')throw Error('Unknown OSM environment');
 return OSM_CONFIG[environment];
}
