import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer } from "../renderer/RendererFactory.js";
import { MeshRendererB } from "../renderer/MeshRendererB.js";
import { MeshRendererC } from "../renderer/MeshRendererC.js";

const settings={fog:{enabled:true,mode:"linear",color:"#c0d6c5",start:1000,end:2200},lighting:{direction:[-7,13,5],ambientIntensity:.84,directionalIntensity:1.15}};

test("C is a separate Three.js-derived mesh renderer with the standard contract",async()=>{
 const b=await createRenderer("B",{profile:"mesh",settings});
 const c=await createRenderer("C",{profile:"mesh",settings});
 assert.ok(b instanceof MeshRendererB);
 assert.ok(!(b instanceof MeshRendererC));
 assert.ok(c instanceof MeshRendererC);
 assert.ok(c instanceof MeshRendererB);
 assert.notEqual(b.constructor,c.constructor);
 assert.deepEqual(c.renderSettings,b.renderSettings);
 assert.equal(c.lastFrameId,-1);
 for(const method of ["initialize","render","resize","dispose"])assert.equal(typeof c[method],"function");
});

test("C material uses its own factory while matching B's initial look",()=>{
 class Material{constructor(parameters){this.parameters=parameters;}}
 class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;}}
 const c=new MeshRendererC();
 c.THREE={MeshLambertMaterial:Material,Mesh,DoubleSide:2};
 const descriptor={vertexCount:3};
 c.geometryFor=key=>key;
 const added=[];c.scene={add:mesh=>added.push(mesh)};
 const mesh=c.makeMesh({geometry:descriptor});
 assert.equal(mesh.geometry,descriptor);
 assert.deepEqual(mesh.material.parameters,{vertexColors:true,side:2,transparent:false,depthWrite:true});
 assert.equal(mesh.frustumCulled,false);
 assert.deepEqual(added,[mesh]);
 const b=new MeshRendererB();
 assert.equal(b.makeMesh,MeshRendererB.prototype.makeMesh);
 assert.notEqual(c.makeMesh,b.makeMesh);
});

test("C cannot silently fall back to box profile and keeps legacy A/B factory behavior",async()=>{
 await assert.rejects(createRenderer("C",{profile:"box"}),/mesh profile only/);
 await assert.rejects(createRenderer("C"),/mesh profile only/);
 await assert.rejects(createRenderer("unknown",{profile:"mesh"}),/Unknown Renderer backend/);
 const a=await createRenderer("A",{profile:"mesh"});
 const b=await createRenderer("B",{profile:"mesh"});
 assert.equal(a.renderSettings,null);
 assert.equal(b.renderSettings,null);
});
