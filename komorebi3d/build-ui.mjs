#!/usr/bin/env node
// Mock-first shared UI builder. UI fragments are canonical; dev.html owns all game code.
// --mock: preview UI in a black, non-rendering mock only
// --sync-dev: after UI approval, update ONLY dev.html's inline CSS and panel shell, then mock
// --check: ensure both tracked pages match UI fragments without writing anything
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=dirname(fileURLToPath(import.meta.url));
const read=path=>readFileSync(join(dir,path),'utf8');
const args=process.argv.slice(2);
if(args.length!==1||!['--mock','--sync-dev','--check','--check-mock'].includes(args[0]))
 throw Error('Usage: node komorebi3d/build-ui.mjs --mock|--sync-dev|--check|--check-mock');
const mode=args[0];
const fragment=name=>read('panels/'+name+'.html').trimEnd();
const split=css=>{
 const pos=css.indexOf('@media ');
 return pos<0?[css.trim(),'']:[css.slice(0,pos).trim(),css.slice(pos).trim()];
};
const cssFiles=['common.css','panels/build.css','panels/game.css','panels/test.css','panels/runtime.css','panels/storage.css','layout.css'];
const cssParts=cssFiles.map(p=>split(read(p)));
const sharedCSS=[...cssParts.map(x=>x[0]),...cssParts.map(x=>x[1]),read('theme.css').trim()].filter(Boolean).join('\n\n');
const objectMarker='/* @object:';
function replaceOnce(source,oldValue,newValue,context){
 if(source.split(oldValue).length!==2)throw Error('Missing or duplicate '+context);
 return source.replace(oldValue,newValue);
}
function shell(mock){
 let result=read('page-shell.html').trimEnd();
 result=replaceOnce(result,'/* @heading-attrs */',mock?'':' style="display:flex;justify-content:space-between"','heading');
 let game=fragment(mock?'game.mock':'game');
 game=replaceOnce(game,'<!-- @game-touch -->',fragment('game.touch'),'game touch layer');
 game=replaceOnce(fragment('game.frame'),'<!-- @game-view -->',game,'game frame');
 let build=fragment('build');
 if(mock)build=replaceOnce(build,'id="dev-engine">56bb2bc</code>','id="dev-engine">000000</code>','mock engine placeholder');
 let runtime=fragment('runtime');
 runtime=replaceOnce(runtime,'<!-- @launch-diagnostic -->',mock?'':read('dev-launch-diagnostic.html').trimEnd(),'runtime diagnostic');
 for(const [key,value] of [['build',build],['game',game],['test',fragment('test')],['runtime',runtime],['storage',fragment('storage')]])
  result=replaceOnce(result,'<!-- @panel:'+key+' -->',value,key+' panel');
 if(/<!-- @panel:|<!-- @game-view -->|<!-- @game-touch -->|@launch-diagnostic|@heading-attrs/.test(result))
  throw Error('Unresolved UI placeholder');
 return result;
}
const dev=read('dev.html');
const styleOpen='<style>',styleClose='</style>',bodyOpen='<body>';
const a=dev.indexOf(styleOpen),b=dev.indexOf(styleClose,a),c=dev.indexOf(bodyOpen,b);
const script=dev.indexOf('<script',c);
if(a<0||b<a||c<b||script<c||dev.indexOf(styleOpen,a+1)!==-1)
 throw Error('Unexpected dev.html boundaries: refuse to modify game');
const devStyle=dev.slice(a+styleOpen.length,b);
const devShell=dev.slice(c+bodyOpen.length,script);
const gameShell=shell(false);
const mockShell=shell(true);
if((gameShell.match(/<canvas\b/g)||[]).length<2)throw Error('Game canvas is missing from UI source');
if(/<canvas\b|<script\b|id="views"/.test(mockShell))
 throw Error('Mock must contain no Canvas, game scripts or game viewports');
if((mockShell.match(/id="play-surface"/g)||[]).length!==1)
 throw Error('Mock must have exactly one black game placeholder');
const currentDev=dev.slice(0,a+styleOpen.length)+sharedCSS+dev.slice(b,c+bodyOpen.length)+gameShell+dev.slice(script);
const title='<title>Komorebi 3D DEV｜NPC表示限界テスト</title>';
let mockHead=dev.slice(0,a+styleOpen.length)+sharedCSS+dev.slice(b,c);
mockHead=replaceOnce(mockHead,title,'<title>Komorebi 3D｜4パネルモック</title>','mock title');
const mockCSS=read('panels/game.mock.css').trim();
mockHead=replaceOnce(mockHead,styleClose,'\n\n/* Mock-only viewport: replace 3D rendering with a black dummy. */\n'+mockCSS+'\n'+
 '.mock-root .landscape-game .play-surface,.mock-root .play-surface .screen-view{background:#000}\n</style>','mock CSS');
const expectedMock=mockHead+bodyOpen+mockShell+'<script type="module" src="./mock-ui.js?v=mock-storage-id-search-20261122"></script></body></html>\n';
if((expectedMock.match(/<script\b/g)||[]).length!==1||expectedMock.includes(objectMarker))
 throw Error('Mock may contain only its independent UI script');
const write=(path,value)=>{writeFileSync(join(dir,path),value,'utf8');console.log('Updated '+path)};
const assertSame=(name,expected)=>{
 if(read(name)!==expected)throw Error(name+' UI out of sync. Run --mock then --sync-dev after approval');
 console.log(name+' UI sync: OK');
};
if(mode==='--mock')write('mock.html',expectedMock);
else if(mode==='--sync-dev'){
 // The only permitted dev.html change is CSS and shell; never regenerate its scripts.
 if(currentDev!==dev)write('dev.html',currentDev);
 write('mock.html',expectedMock);
}else if(mode==='--check-mock')assertSame('mock.html',expectedMock);
else{
 if(devStyle!==sharedCSS||devShell!==gameShell)throw Error('dev.html shared UI out of sync; run --sync-dev after mock approval');
 assertSame('mock.html',expectedMock);
}
