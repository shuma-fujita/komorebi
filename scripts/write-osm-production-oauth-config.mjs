#!/usr/bin/env node
// Production Client ID is optional during Step 3; missing configuration must not stop TEST deployment.
import {writeFileSync} from 'node:fs';
const destination=process.argv[2];
if(!destination)throw Error('Expected Pages artifact config destination');
const id=(process.env.OSM_PRODUCTION_CLIENT_ID||'').trim();
if(id.length>512||/[\s\x00-\x1f]/.test(id))throw Error('OSM_PRODUCTION_CLIENT_ID is invalid.');
writeFileSync(destination,'// Generated in GitHub Actions; public OAuth Client ID.\nexport const OSM_PRODUCTION_CLIENT_ID='+JSON.stringify(id)+';\n',{mode:0o644});
console.log(id?'Production OAuth config generated (value withheld).':'Production OAuth not configured; TEST deployment continues.');
