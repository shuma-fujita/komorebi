// Isolated OSM-building view for the tenant editor.
// Reuses the same map geometry builder, without moving the helicopter or changing
// the original map meshes. No animation dependencies.
import {buildMap} from './map-builder.js?v=smbc-v1-20261125';
import {tileCenterWgs84} from './tile-grid.js?v=tile-grid-epsg6677-20261114';
import {BUILDING_PREVIEW_RATIO,buildingPreviewCenterY} from './building-editor-layout.js?v=ratio-centered-20261121';
let previewRevision=0;

// Optional draft tags affect only this isolated preview, never OSM or the map.
export function createBuildingEditorPreview(feature,shops,createMeshGeometry,draft=null){

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
 // Match by original OSM ID, never by a copied development-server ID.
 let tenantLevelChanged=false;
 if(draft?.tags){
  const target=tenantNodes.find(n=>draft.osmType==='node'&&String(n.id)===String(draft.osmId));
  if(target){
   tenantLevelChanged=String(target.tags.level??'')!==String(draft.tags.level??'');
   target.tags={...draft.tags};
  }
 }
 const e=feature.previewSource;
 const editingBuilding=!!draft?.tags&&draft.osmType===feature.osmType&&
  String(draft.osmId)===String(feature.osmId);
 const buildingTags={...(editingBuilding?draft.tags:e.tags||{})};
 let previewHeight=feature.height;
 if(editingBuilding){
  const h=Number(buildingTags.height);
  const floors=Number(buildingTags['building:levels']);
  if(Number.isFinite(h)&&h>=2&&h<=180)previewHeight=h;
  else if(Number.isFinite(floors)&&floors>0)previewHeight=Math.min(180,floors*3);
 }
 buildingTags.height=String(previewHeight);
 // A level is zero-based: level=10 requires an 11th floor. For an
 // editor-only draft, grow the isolated building if needed; do not mutate
 // authoritative source geometry or write inferred levels back to OSM.
 if(tenantLevelChanged){
  const numericLevels=tenantNodes.filter(n=>n.tags?.shop==='convenience')
   .flatMap(n=>String(n.tags.level??'').split(';').map(v=>v.trim()))
   .filter(v=>/^\d+$/.test(v)).map(Number)
   .filter(v=>Number.isSafeInteger(v)&&v>=0&&v<45);
  const maxLevel=numericLevels.length?Math.max(...numericLevels):-1;
  if(maxLevel>=0){
   const explicitLevels=Number(buildingTags['building:levels']);
   const explicitCount=Number.isSafeInteger(explicitLevels)&&explicitLevels>0?explicitLevels:null;
   const baseCount=explicitCount??Math.max(1,Math.round(feature.height/4));
   const floorHeight=explicitCount?feature.height/explicitCount:4;
   const count=Math.max(baseCount,maxLevel+1);
   previewHeight=Math.max(feature.height,count*floorHeight);
   buildingTags.height=String(previewHeight);
   buildingTags['building:levels']=String(count);
  }
 }
 const building={...e,tags:buildingTags};
 const map={tile,elements:[building,...tenantNodes]};
 const result=buildMap(map,{halfSize:Math.max(1000,Math.abs(minX)+30,Math.abs(maxX)+30,Math.abs(minZ)+30,Math.abs(maxZ)+30),
  priorityX:(minX+maxX)/2,priorityZ:(minZ+maxZ)/2});
 const geometry=[];
 const revision=++previewRevision;
 for(const mesh of result.meshes){
  if(!mesh.positions?.length)continue;
  // Exclude the full-map grassy floor: this preview contains only building geometry.
  let raised=false;
  for(let i=1;i<mesh.positions.length;i+=3)if(mesh.positions[i]>.15){raised=true;break;}
  if(!raised)continue;
  geometry.push(createMeshGeometry({
   id:'matsudo:editor-building:'+feature.osmType+':'+feature.osmId+':'+revision+':'+geometry.length,
   positions:mesh.positions,normals:mesh.normals,colors:mesh.colors
  }));
 }
 if(!geometry.length)return null;
 return {geometry,texturedFaces:result.texturedFaces,centerX:(minX+maxX)/2,centerZ:(minZ+maxZ)/2,
  width:Math.max(3,maxX-minX),depth:Math.max(3,maxZ-minZ),height:Math.max(3,previewHeight)};
}

// The 3D canvas remains full height under the editor sheet.
// Center the building in the uncovered upper preview at y=ratio/2.
export function buildingEditorCamera(preview,aspect,{yaw=0,zoom=1}={},previewRatio=BUILDING_PREVIEW_RATIO){
 const {centerX:x,centerZ:z,width,depth,height}=preview;
 const centerY=buildingPreviewCenterY(previewRatio);
 const visibleRatio=centerY*2;
 const safeAspect=Math.max(.24,Math.min(2,Number.isFinite(aspect)?aspect:1));
 const center=[x,height*.5,z];
 // Rotate the camera around the vertical axis only. Pitch stays unchanged.
 const angle=Math.atan2(.65,.75)+(Number.isFinite(yaw)?yaw:0);
 const direction=[Math.sin(angle)*Math.hypot(.65,.75),.48,Math.cos(angle)*Math.hypot(.65,.75)];
 const directionLength=Math.hypot(...direction);
 const backward=direction.map(v=>v/directionLength);
 const forward=backward.map(v=>-v);
 const right=[-forward[2],0,forward[0]];
 const rightLength=Math.hypot(...right);
 for(let i=0;i<3;i++)right[i]/=rightLength;
 const up=[
  right[1]*forward[2]-right[2]*forward[1],
  right[2]*forward[0]-right[0]*forward[2],
  right[0]*forward[1]-right[1]*forward[0]
 ];
 const tanHalf=Math.tan(45*Math.PI/360);
 // Fit the full box into the visible top strip for *every* yaw without
 // changing zoom during orbit. The box corners sweep a radius around its
 // vertical center, so their extrema can be solved analytically (no sampling).
 // The shifted camera aims the box center at NDC y=(1-previewRatio).
 // For a corner with forward-depth term b, vertical term u and horizontal r:
 //   horizontal: distance >= b + abs(r)/(aspect*tanHalf)
 //   upper:      distance >= (u + tanHalf*b)/(previewRatio*tanHalf)
 //   lower:      distance >= (-u -(1-2*previewRatio)*tanHalf*b)/
 //                          (previewRatio*tanHalf)
 // Maximize these expressions over all yaw angles and all eight box corners.
 // Vertical horizontal-components are collinear, so use absolute sums;
 // only the left/right fit combines orthogonal radial and tangent terms.
 const radius=Math.hypot(width,depth)/2;
 const elevation=Math.abs(backward[1]);
 const horizontal=Math.sqrt(1-elevation*elevation);
 const halfHeight=height*.5;
 const horizontalSlope=tanHalf*safeAspect;
 const verticalSlope=visibleRatio*tanHalf;
 // Only the near-plane check uses a small depth guard; no visual padding.
 const minDepth=radius*horizontal+halfHeight*elevation+.2;
 const horizontalDistance=radius*Math.hypot(horizontal,1/horizontalSlope)+
  halfHeight*elevation;
 const upperDistance=(radius*Math.abs(tanHalf*horizontal-elevation)+
  halfHeight*(horizontal+tanHalf*elevation))/verticalSlope;
 const bottomCoefficient=(1-2*visibleRatio)*tanHalf;
 const lowerDistance=(radius*Math.abs(elevation-bottomCoefficient*horizontal)+
  halfHeight*Math.abs(horizontal+bottomCoefficient*elevation))/verticalSlope;
 let distance=Math.max(minDepth,horizontalDistance,upperDistance,lowerDistance);
 // Default distance fits all corners; pinch modifies only distance.
 distance/=Math.max(.55,Math.min(3,Number.isFinite(zoom)?zoom:1));
 // Shift the camera's center ray down so the building appears at
 // y=visibleRatio/2 measured from the top of the full canvas.
 const offset=distance*tanHalf*(1-visibleRatio);
 const eye=center.map((v,i)=>v+backward[i]*distance-up[i]*offset);
 const target=center.map((v,i)=>v-up[i]*offset);
 return {eye,target};
}
