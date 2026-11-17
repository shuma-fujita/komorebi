import test from "node:test";
import assert from "node:assert/strict";
import {createRenderSettings} from "../renderer/RenderSettings.js";
import {createRenderer} from "../renderer/RendererFactory.js";

test("both mesh renderers retain identical linear-fog inputs",async()=>{
 const settings={fog:{enabled:true,mode:"linear",color:"#c0d6c5",start:1000,end:2200},background:{color:"#c0d6c5"}};
 const a=await createRenderer("A",{profile:"mesh",settings});
 const b=await createRenderer("B",{profile:"mesh",settings});
 assert.deepEqual(a.renderSettings,b.renderSettings);
 assert.equal(a.renderSettings.fog.end,2200);
 assert.ok(Object.isFrozen(a.renderSettings));
});
test("fog settings can be turned off without changing legacy defaults",async()=>{
 const settings=createRenderSettings({fog:{enabled:false,mode:"linear",color:"#c0d6c5",start:1000,end:2200}});
 assert.equal(settings.fog.enabled,false);
 for(const backend of ["A","B"]){
  const legacy=await createRenderer(backend,{profile:"mesh"});
  assert.equal(legacy.renderSettings,null);
 }
});
