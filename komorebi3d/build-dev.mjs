#!/usr/bin/env node
// The game source of truth is dev.html. This script builds ONLY the UI mock.
// It must never generate or overwrite dev.html.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const modeArgs=process.argv.filter(arg=>arg.startsWith('--mode='));
if(modeArgs.length>1)throw Error('Specify --mode only once');
const mode=modeArgs[0]?.slice('--mode='.length)??'mock';
if(mode!=='mock')throw Error('Only --mode=mock is supported; dev.html is edited and published directly');
const panelIds=['build','game','test','runtime'];
const variant=id=>id==='game'?'game.mock':id;
const names=['common',...panelIds.map(variant),'layout'];
const read=path=>readFileSync(join(dir,path),'utf8');
const split=css=>{
 const pos=css.indexOf('@media ');
 return pos<0?[css.trim(),'']:[css.slice(0,pos).trim(),css.slice(pos).trim()];
};
const cssPath=name=>name==='common'?'common.css':name==='layout'?'layout.css':'panels/'+name+'.css';
const commonCSS=read('common.css');
const pieces=names.map(name=>split(name==='common'?commonCSS:read(cssPath(name))));
const css=[...pieces.map(x=>x[0]),...pieces.map(x=>x[1]),read('theme.css').trim()].filter(Boolean).join('\n\n');
let html=read('mock.template.html');
if(!html.includes('<!-- @page-shell -->'))throw Error('Missing shared page shell marker');
let shell=read('page-shell.html').trimEnd();
shell=shell.replace('/* @heading-attrs */','');
if(shell.includes('/* @heading-attrs */'))throw Error('Unresolved shared page shell marker');
html=html.replace('<!-- @page-shell -->',shell);
if(!html.includes('/* @component-styles */'))throw Error('Missing CSS placeholder');
html=html.replace('/* @component-styles */',css);
for(const id of panelIds){
 const marker='<!-- @panel:'+id+' -->';
 if(!html.includes(marker))throw Error('Missing panel '+id);
 let panelHtml=read('panels/'+variant(id)+'.html').trimEnd();
 if(id==='runtime'){
  if(!panelHtml.includes('<!-- @launch-diagnostic -->'))throw Error('Missing runtime diagnostic marker');
  panelHtml=panelHtml.replace('<!-- @launch-diagnostic -->','');
 }
 if(id==='game'){
  const gameFrame=read('panels/game.frame.html').trimEnd();
  if(!gameFrame.includes('<!-- @game-view -->'))throw Error('Missing shared game view marker');
  panelHtml=gameFrame.replace('<!-- @game-view -->',panelHtml);
  const touchMarker='<!-- @game-touch -->';
  if(!panelHtml.includes(touchMarker))throw Error('Missing shared touch layer marker');
  panelHtml=panelHtml.replace(touchMarker,read('panels/game.touch.html').trimEnd());
 }
 if(id==='build'){
  const real='id="dev-engine">56bb2bc</code>';
  if(!panelHtml.includes(real))throw Error('Missing mock Engine label');
  panelHtml=panelHtml.replace(real,'id="dev-engine">000000</code>');
 }
 html=html.replace(marker,panelHtml);
}
if(html.includes('<!-- @page-shell -->'))throw Error('Unresolved shared page shell');
if(html.includes('<!-- @game-view -->'))throw Error('Unresolved shared game view');
if(html.includes('<!-- @game-touch -->'))throw Error('Unresolved shared touch layer');
if(html.includes('<!-- @panel:')||html.includes('/* @component-styles */'))throw Error('Unresolved placeholder');
const output=join(dir,'mock.html');
if(process.argv.includes('--check')){
 let actual='';
 try{actual=readFileSync(output,'utf8')}catch{}
 if(actual!==html){console.error('mock.html out of sync; run node komorebi3d/build-dev.mjs --mode=mock');process.exitCode=1;}
 else console.log('mock.html sync: OK');
}else{writeFileSync(output,html,'utf8');console.log('Updated mock.html');}
