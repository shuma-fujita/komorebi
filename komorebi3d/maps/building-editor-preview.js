// Isolated OSM-building view for the tenant editor.
// Reuses the same map geometry builder, without moving the helicopter or changing
// the original map meshes. No animation dependencies.
import {buildMap} from './map-builder.js?v=food-storefront-20261119';
import {tileCenterWgs84} from './tile-grid.js?v=tile-grid-epsg6677-20261114';

export function createBuildingEditorPreview(feature,shops,createMeshGeometry){
 if(!feature||!feature.previewSource||!Array.isArray(feature.bounds))return null;
 const [minX,maxX,minZ,maxZ]=feature.bounds;
 if(![minX,maxX,minZ,maxZ,feature.height].every(Number.isFinite))return null;
 const tile=feature.previewTile;
 const origin=tile?tileCenterWgs84(tile):{latitude:35.78444,longitude:139.90061};
 const cos=Math.cos(origin.latitude*Math.PI/180);
 // Supply nearby store nodes so the existing facade/tenant matching logic runs.
 const tenantNodes=(shops||[]).filter(s=>s.kind==='poi'&&s.osmType==='node'&&
  Number.isFinite(s.x)&&Number.isFinite(s.z)).map(s=>({
   type:'node',id:s.osmId,version:s.osmVersion??null,
   lat:origin.latitude-s.z/111320,
   lon:origin.longitude+s.x/(111320*cos),
   tags:{...(s.tags||{})}
 }));
 const e=feature.previewSource;
 const building={...e,tags:{...(e.tags||{}),height:String(feature.height)}};
 const map={tile,elements:[building,...tenantNodes]};
 const result=buildMap(map,{halfSize:Math.max(1000,Math.abs(minX)+30,Math.abs(maxX)+30,Math.abs(minZ)+30,Math.abs(maxZ)+30),
  priorityX:(minX+maxX)/2,priorityZ:(minZ+maxZ)/2});
 const geometry=[];
 for(const mesh of result.meshes){
  if(!mesh.positions?.length)continue;
  // Exclude the full-map grassy floor: this preview contains only building geometry.
  let raised=false;
  for(let i=1;i<mesh.positions.length;i+=3)if(mesh.positions[i]>.15){raised=true;break;}
  if(!raised)continue;
  geometry.push(createMeshGeometry({
   id:'matsudo:editor-building:'+feature.osmType+':'+feature.osmId+':'+geometry.length,
   positions:mesh.positions,normals:mesh.normals,colors:mesh.colors
  }));
 }
 if(!geometry.length)return null;
 return {geometry,centerX:(minX+maxX)/2,centerZ:(minZ+maxZ)/2,
  width:Math.max(3,maxX-minX),depth:Math.max(3,maxZ-minZ),height:Math.max(3,feature.height)};
}

export function buildingEditorCamera(preview,aspect){
 const {centerX:x,centerZ:z,width,depth,height}=preview;
 const safeAspect=Math.max(.24,Math.min(2,Number.isFinite(aspect)?aspect:1));
 const span=Math.hypot(width,depth);
 // Narrow A/B viewports need additional distance so the full footprint fits.
 const distance=Math.max(18,height*2.25,span*1.45/Math.min(1,safeAspect));
 const target=[x,height*.48,z];
 const eye=[x+distance*.65,target[1]+distance*.48,z+distance*.75];
 return {eye,target};
}
