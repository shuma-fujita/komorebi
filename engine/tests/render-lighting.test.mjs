import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer } from "../renderer/RendererFactory.js";

const shared={lighting:{ambientIntensity:.84,directionalIntensity:1.15,direction:[-7,13,5]}};
test("mesh A/B accept identical lighting and retain independent renderers",async()=>{
 const a=await createRenderer("A",{profile:"mesh",settings:shared});
 const b=await createRenderer("B",{profile:"mesh",settings:shared});
 assert.deepEqual(a.renderSettings.lighting,b.renderSettings.lighting);
 assert.equal(a.lastFrameId,-1);
 assert.equal(b.lastFrameId,-1);
});
test("existing no-settings path keeps independent legacy lighting",async()=>{
 for(const backend of ["A","B"]){
  const renderer=await createRenderer(backend,{profile:"mesh"});
  assert.equal(renderer.renderSettings,null);
 }
});
