// Environment constants only. Production remains read-only in Step 1-A.
export const OSM_TEST=Object.freeze({
 origin:'https://master.apis.dev.openstreetmap.org',
 apiOrigin:'https://master.apis.dev.openstreetmap.org',
 redirectUri:'https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html',
 tokenKey:'komorebi:osm-test:token',
 authKey:'komorebi:osm-test:oauth',
 errorKey:'komorebi:osm-test:error'
});
export const OSM_PRODUCTION=Object.freeze({
 origin:'https://www.openstreetmap.org',
 apiOrigin:'https://api.openstreetmap.org',
 redirectUri:'https://shuma-fujita.github.io/komorebi/komorebi3d/dev.html',
 tokenKey:'komorebi:osm-production:token',
 authKey:'komorebi:osm-production:oauth',
 errorKey:'komorebi:osm-production:error'
});
