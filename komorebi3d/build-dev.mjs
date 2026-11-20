#!/usr/bin/env node
// Generate ONLY mock.html from the checked-in, canonical dev.html UI.
// Never write dev.html or run any game engine in the mock.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=dirname(fileURLToPath(import.meta.url));
const read=path=>readFileSync(join(dir,path),'utf8');
const modeArgs=process.argv.filter(x=>x.startsWith('--mode='));
if(modeArgs.length>1)throw Error('Specify --mode only once');
if(modeArgs[0]&&modeArgs[0]!=='--mode=mock')
 throw Error('Only --mode=mock is supported; dev.html is never generated');
if(process.argv.slice(2).some(x=>!['--mode=mock','--check'].includes(x)))
 throw Error('Unknown build option');

const source=read('dev.html');
const title='<title>Komorebi 3D DEV｜NPC表示限界テスト</title>';
const bodyStart=source.indexOf('<body>');
const scriptStart=source.indexOf('<script',bodyStart);
if(bodyStart<0||scriptStart<bodyStart||!source.includes(title))
 throw Error('Canonical dev.html layout changed: cannot safely derive mock');

const mockStyle=read('panels/game.mock.css').trim();
let head=source.slice(0,bodyStart).replace(title,'<title>Komorebi 3D｜4パネルモック</title>');
if(!head.includes('</style>'))throw Error('Canonical dev.html lacks inline CSS');
head=head.replace('</style>', '\n\n/* Mock-only viewport: replace 3D rendering with a black dummy. */\n'+mockStyle+'\n'+
 '.mock-root .landscape-game .play-surface,.mock-root .play-surface .screen-view{background:#000}\n</style>');

let body=source.slice(bodyStart,scriptStart);
const gameStart=body.indexOf('<div class="landscape-game" data-panel-id="game">');
const helpStart=body.indexOf('<button type="button" id="game-help-button"',gameStart);
if(gameStart<0||helpStart<=gameStart||body.indexOf('<div class="landscape-game" data-panel-id="game">',gameStart+1)!==-1)
 throw Error('Cannot uniquely identify real game viewport');
const mockViewport='<div class="landscape-game" data-panel-id="game">'+
 '<div class="play-surface" id="play-surface" aria-label="ゲーム画面（描画なし）"></div>'+
 read('panels/game.touch.html').trimEnd();
body=body.slice(0,gameStart)+mockViewport+body.slice(helpStart);
const diagnostic=read('dev-launch-diagnostic.html').trimEnd();
if(!body.includes(diagnostic))throw Error('Missing dev-only launch diagnostic');
body=body.replace(diagnostic,'');
const engineLabel='id="dev-engine">56bb2bc</code>';
if(!body.includes(engineLabel))throw Error('Missing fixed Engine label');
body=body.replace(engineLabel,'id="dev-engine">000000</code>');
const heading='<div class="site-heading" style="display:flex;justify-content:space-between">';
if(!body.includes(heading))throw Error('Missing dev-only heading layout');
body=body.replace(heading,'<div class="site-heading">');
if(body.includes('<canvas')||body.includes('<script')||body.includes('id="views"'))
 throw Error('Mock must contain no game canvases, viewports or game scripts');
if((body.match(/id="play-surface"/g)||[]).length!==1)
 throw Error('Mock must have exactly one dummy game surface');

const result=head+body+'<script type="module" src="./mock-ui.js"></script></body></html>\n';
const output=join(dir,'mock.html');
if(process.argv.includes('--check')){
 if(read('mock.html')!==result){console.error('mock.html is out of sync: run node komorebi3d/build-dev.mjs');process.exitCode=1;}
 else console.log('mock.html matches dev.html shared UI: OK (no game canvas)');
}else{
 writeFileSync(output,result,'utf8');
 console.log('Updated mock.html from canonical dev.html UI (black non-rendering game surface)');
}
