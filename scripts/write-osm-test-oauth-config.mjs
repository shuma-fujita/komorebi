#!/usr/bin/env node
// Emit a public OAuth client identifier ONLY into the Pages artifact.
// The source tree and git commits must never contain the value.
import {writeFileSync} from 'node:fs';
const destination=process.argv[2];
if(!destination)throw Error('Expected Pages artifact config destination');
const id=(process.env.OSM_TEST_CLIENT_ID||'').trim();
if(!id||id.length>512||/[\s\x00-\x1f]/.test(id)){
 console.error('OSM_TEST_CLIENT_ID Secret is missing or invalid. Configure it in repository Actions Secrets.');
 process.exitCode=1;
}else{
 writeFileSync(destination,'// Generated in GitHub Actions; not committed. Public OAuth client identifier.\nexport const OSM_TEST_CLIENT_ID='+JSON.stringify(id)+';\n',{mode:0o644});
 console.log('Pages OAuth Client ID config generated (value withheld).');
}
