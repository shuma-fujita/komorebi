/**
 * Renderer C / Komorebi Style (Phase 1 foundation).
 * Shares the tested Three.js mesh, camera, fog and lifecycle machinery with B.
 * Material construction is C-owned so future art direction never changes B.
 * Not connected to the game UI or its pinned renderer in Phase 1.
 */
import { MeshRendererB } from "./MeshRendererB.js";

export class MeshRendererC extends MeshRendererB {
  createMaterial() {
    // Identical to B at the Phase 1 baseline. C-only styling begins here later.
    return new this.THREE.MeshLambertMaterial({
      vertexColors:true,side:this.THREE.DoubleSide,transparent:false,
      depthWrite:true
    });
  }

  makeMesh(item) {
    const mesh=new this.THREE.Mesh(this.geometryFor(item.geometry),this.createMaterial());
    mesh.frustumCulled=false; // Match B's dynamic mesh bounds behavior.
    this.scene.add(mesh);
    return mesh;
  }
}
