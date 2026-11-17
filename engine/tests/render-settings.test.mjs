import test from "node:test";
import assert from "node:assert/strict";
import {createRenderer} from "../renderer/RendererFactory.js";
import {createRenderSettings} from "../renderer/RenderSettings.js";

const options={
  camera:{fovDegrees:45,near:.1,far:2200},
  fog:{enabled:true,mode:"linear",start:1000,end:2200,color:"#c0d6c5"},
  background:{color:"#c0d6c5"},
  lighting:{ambientIntensity:.84,directionalIntensity:1.15,direction:[-7,13,5]},
  colorProcessing:{outputColorSpace:"srgb",toneMapping:"none"},
  resolution:{maxPixelRatio:2}
};

test("both mesh backends accept the same validated settings without changing the legacy path",async()=>{
  for(const backend of ["A","B"]){
    const legacy=await createRenderer(backend,{profile:"mesh"});
    assert.equal(legacy.renderSettings,null);
    const renderer=await createRenderer(backend,{profile:"mesh",settings:options});
    assert.deepEqual(renderer.renderSettings,options);
    assert.ok(Object.isFrozen(renderer.renderSettings));
    assert.ok(Object.isFrozen(renderer.renderSettings.fog));
    assert.ok(Object.isFrozen(renderer.renderSettings.lighting.direction));
    assert.equal(renderer.lastFrameId,-1);
  }
});

test("settings are detached from mutable caller input",()=>{
  const settings=createRenderSettings(options);
  const previous=settings.lighting.direction[0];
  const copy={...options,lighting:{...options.lighting,direction:[-7,13,5]}};
  const frozen=createRenderSettings(copy);
  copy.lighting.direction[0]=100;
  assert.equal(frozen.lighting.direction[0],previous);
  assert.throws(()=>{frozen.fog.density=0.2},TypeError);
});

test("invalid types, ranges, unsupported names and malformed colors are rejected",async()=>{
  for(const input of [
    null, [], {other:{}}, {fog:{unknown:1}}, {fog:{enabled:"true"}},
    {fog:{mode:"unknown"}}, {fog:{density:-1}}, {fog:{start:200,end:100}},
    {fog:{color:"#fff"}}, {camera:{near:10,far:1}},
    {camera:{fovDegrees:180}}, {lighting:{direction:[1,2]}},
    {resolution:{maxPixelRatio:0}}
  ])assert.throws(()=>createRenderSettings(input),TypeError);
  await assert.rejects(createRenderer("A",{profile:"mesh",settings:{fog:{density:-1}}}),TypeError);
});

test("zero light direction is invalid but non-unit direction is accepted",()=>{
  assert.throws(()=>createRenderSettings({lighting:{direction:[0,0,0]}}),/lighting.direction/);
  const settings=createRenderSettings({lighting:{ambientIntensity:.84,directionalIntensity:1.15,direction:[-7,13,5]}});
  assert.deepEqual(settings.lighting.direction,[-7,13,5]);
});
