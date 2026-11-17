import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../../komorebi3d/"+path,import.meta.url),"utf8");

test("both screen cards offer three distinct Engine choices with initial WebGL selection",()=>{
 const html=read("panels/test.html");
 for(const screen of ["A","B"]){
  const section=html.match(new RegExp('<div class="screen-card" data-screen="'+screen+'">([\\s\\S]*?)(?=<\\/div>\\n<\\/div>|<div class="screen-card"|<!-- @screen-settings:end -->)'))?.[1];
  assert.ok(section,"screen "+screen+" missing");
  for(const engine of ["A","B","C"])assert.match(section,new RegExp('data-engine="'+engine+'"'));
  assert.match(section,/data-engine="A" aria-pressed="true" class="selected"/);
  assert.match(section,/data-engine="C" aria-pressed="false">Komorebi/);
 }
});

test("game uses a C-enabled pinned factory and rejects no existing engine option",()=>{
 const live=read("dev.template.html");
 assert.match(live,/RendererFactory\\.js/);
 assert.match(live,/@890e501969c2906b4d5666d7a4611e4223397f7a\\/engine\\/renderer\\/RendererFactory\\.js/);
 assert.ok(live.includes("(setting==='map'?['old','new']:['A','B','C']).includes(value)"));
 for(const name of ["dev.html","mock.html"]){
  const html=read(name);
  for(const engine of ["A","B","C"])assert.ok(html.includes('data-engine="'+engine+'"'));
  assert.ok(html.includes('class="engine-buttons"'));
 }
});

test("mock and panel controller handle engine buttons and C labels",()=>{
 const mock=read("mock.template.html"),controller=read("dev-panel-components.js");
 assert.ok(mock.includes("C:'Komorebi'"));
 assert.ok(mock.includes("queueMicrotask(update)"));
 assert.ok(controller.includes("['A','B','C']).includes(next)"));
 assert.ok(controller.includes("querySelectorAll('.screen-settings [data-engine]')"));
 assert.ok(controller.includes("button.setAttribute('aria-pressed',String(selected))"));
});
