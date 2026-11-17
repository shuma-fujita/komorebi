#!/usr/bin/env node
// Build the development page or lightweight web mock. Production mode is reserved for later.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const modeArgs=process.argv.filter(arg=>arg.startsWith('--mode='));
if(modeArgs.length>1)throw Error('Specify --mode only once');
const mode=modeArgs[0]?.slice('--mode='.length)??'dev';
if(!['dev','mock'].includes(mode))throw Error('Unknown mode: '+mode);
const mock=mode==='mock';
const panelIds=['build','game','test','runtime'];
const variant=id=>mock&&id==='game'?id+'.mock':id;
const names=['common',...panelIds.map(variant),'layout'];
const read=path=>readFileSync(join(dir,path),'utf8');
const split=css=>{
 const pos=css.indexOf('@media ');
 return pos<0?[css.trim(),'']:[css.slice(0,pos).trim(),css.slice(pos).trim()];
};
const cssPath=name=>name==='common'?'common.css':name==='layout'?'layout.css':'panels/'+name+'.css';
// Both pages use the canonical test panel markup and CSS; only the game viewport differs.
const commonCSS=read('common.css');
const pieces=names.map(name=>split(name==='common'?commonCSS:read(cssPath(name))));
// The color theme goes last so it overrides component and @media colors.
const css=[...pieces.map(x=>x[0]),...pieces.map(x=>x[1]),read('theme.css').trim()].filter(Boolean).join('\n\n');
let html=read(mock?'mock.template.html':'dev.template.html');
if(!html.includes('<!-- @page-shell -->'))throw Error('Missing shared page shell marker');
let shell=read('page-shell.html').trimEnd();
shell=shell.replace('/* @heading-attrs */',mock?'':' style="display:flex;justify-content:space-between"');
if(shell.includes('/* @heading-attrs */'))
 throw Error('Unresolved page shell marker');
html=html.replace('<!-- @page-shell -->',shell);
if(!mock){
 // Inline object fragments verbatim into their original game script scope.
 for(const path of ['objects/forest/layout.js','objects/trees/tree-v1.js','objects/trees/tree-v2.js','objects/trees/tree-v3.js','objects/buildings/house.js','objects/buildings/cafe.js','objects/forest/details.js','objects/characters/ghost-helicopter.js']){
  const marker='/* @object:'+path+' */';
  if(!html.includes(marker))throw Error('Missing object '+path);
  html=html.replace(marker,read(path));
 }
 if(html.includes('/* @object:'))throw Error('Unresolved object placeholder');
}
if(!html.includes('/* @component-styles */'))throw Error('Missing CSS placeholder');
html=html.replace('/* @component-styles */',css);
for(const id of panelIds){
 const marker='<!-- @panel:'+id+' -->';
 if(!html.includes(marker))throw Error('Missing panel '+id);
 let panelHtml=read('panels/'+variant(id)+'.html').trimEnd();
 if(id==='runtime'){
  if(!panelHtml.includes('<!-- @launch-diagnostic -->'))throw Error('Missing runtime diagnostic marker');
  panelHtml=panelHtml.replace('<!-- @launch-diagnostic -->',mock?'':read('dev-launch-diagnostic.html').trimEnd());
 }
 if(id==='game'){
  const gameFrame=read('panels/game.frame.html').trimEnd();
  if(!gameFrame.includes('<!-- @game-view -->'))throw Error('Missing shared game view marker');
  panelHtml=gameFrame.replace('<!-- @game-view -->',panelHtml);
  const touchMarker='<!-- @game-touch -->';
  if(!panelHtml.includes(touchMarker))throw Error('Missing shared touch layer marker');
  panelHtml=panelHtml.replace(touchMarker,read('panels/game.touch.html').trimEnd());
 }
 if(mock&&id==='build'){
  const real='id="dev-engine">56bb2bc</code>';
  if(!panelHtml.includes(real))throw Error('Missing mock Engine label');
  panelHtml=panelHtml.replace(real,'id="dev-engine">000000</code>');
 }
 html=html.replace(marker,panelHtml);
}
if(html.includes('<!-- @page-shell -->'))throw Error('Unresolved shared page shell');
if(html.includes('<!-- @game-view -->'))throw Error('Unresolved game view');
if(html.includes('<!-- @game-touch -->'))throw Error('Unresolved touch layer');
if(html.includes('<!-- @panel:')||html.includes('/* @component-styles */'))throw Error('Unresolved placeholder');
const outputName=mock?'mock.html':'dev.html';
const output=join(dir,outputName);
if(process.argv.includes('--check')){
 let actual='';
 try{actual=readFileSync(output,'utf8')}catch{}
 if(actual!==html){console.error(outputName+' out of sync; run node komorebi3d/build-dev.mjs'+(mode==='dev'?'':' --mode='+mode));process.exitCode=1;}
 else console.log(outputName+' sync: OK');
}else{writeFileSync(output,html,'utf8');console.log('Updated '+outputName);}
