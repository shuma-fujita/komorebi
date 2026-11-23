// Shared entrance-side selector for all OSM storefronts.
// Exclude obstructed/non-road faces first, then choose the middle of the
// longest contiguous (cyclic) run of eligible footprint edges.
const ROAD_REACH_M=35;
const NEAR_BUILDING_M=3;

function intersect(a,b,c,d){
 const ux=b[0]-a[0],uz=b[1]-a[1],vx=d[0]-c[0],vz=d[1]-c[1];
 const denom=ux*vz-uz*vx;
 if(Math.abs(denom)<1e-9)return false;
 const wx=c[0]-a[0],wz=c[1]-a[1];
 const t=(wx*vz-wz*vx)/denom,u=(wx*uz-wz*ux)/denom;
 return t>1e-6&&t<1-1e-6&&u>=0&&u<=1;
}
function crossesFootprint(a,b,footprints){
 for(const polygon of footprints){
  for(let i=0;i<polygon.length;i++)
   if(intersect(a,b,polygon[i],polygon[(i+1)%polygon.length]))return true;
 }
 return false;
}
function roadFacing(edge,roads){
 let closest=null;
 for(const [a,b] of roads){
  const dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((edge.mid[0]-a[0])*dx+(edge.mid[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
  const p=[a[0]+dx*t,a[1]+dz*t];
  const vx=p[0]-edge.mid[0],vz=p[1]-edge.mid[1];
  const forward=vx*edge.normal[0]+vz*edge.normal[1];
  const lateral=Math.abs(vx*edge.normal[1]-vz*edge.normal[0]);
  if(forward<=.01||forward>ROAD_REACH_M||lateral>edge.len/2+3)continue;
  const distance=Math.hypot(vx,vz);
  if(!closest||distance<closest.distance)closest={point:p,distance};
 }
 return closest;
}
// An ordered run is contiguous along the building outline, not spatially
// nearest edges. The wrap-around case (last edge followed by first) is valid.
export function middleEntranceEdge(eligibleEdges,edgeCount){
 if(!Number.isInteger(edgeCount)||edgeCount<=0||!eligibleEdges?.length)return -1;
 const eligible=new Set(eligibleEdges.map(edge=>edge.i));
 if(eligible.size===edgeCount){
  const ordered=eligibleEdges.slice().sort((a,b)=>a.i-b.i);
  return centralEdge(ordered).i;
 }
 const starts=eligibleEdges.filter(edge=>!eligible.has((edge.i+edgeCount-1)%edgeCount));
 let best=null;
 for(const first of starts){
  const run=[];
  for(let index=first.i;eligible.has(index);index=(index+1)%edgeCount){
   const edge=eligibleEdges.find(e=>e.i===index);
   if(!edge||run.length>=edgeCount)break;
   run.push(edge);
  }
  const width=run.reduce((sum,e)=>sum+e.len,0);
  if(!best||run.length>best.run.length||
   run.length===best.run.length&&width>best.width+1e-8||
   run.length===best.run.length&&Math.abs(width-best.width)<=1e-8&&first.i<best.start){
   best={run,width,start:first.i};
  }
 }
 return best?centralEdge(best.run).i:-1;
}
function centralEdge(run){
 const n=run.length;
 if(n%2)return run[(n-1)/2];
 const a=run[n/2-1],b=run[n/2];
 return a.len>=b.len?a:b;
}
// Shared adjacent-building occlusion for any storefront surface, even short edges.
export function blockedBuildingWalls(polygon,otherBuildings=[]){
 const blocked=new Set();
 if(!Array.isArray(polygon)||polygon.length<3)return blocked;
 const area=polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
 const outward=area>=0?1:-1;
 polygon.forEach((a,i)=>{
  const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  if(len<1e-7)return;
  const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const near=[mid[0]+outward*dz/len*NEAR_BUILDING_M,
   mid[1]-outward*dx/len*NEAR_BUILDING_M];
  if(crossesFootprint(mid,near,otherBuildings))blocked.add(i);
 });
 return blocked;
}
// Shared facade-side candidate assessment for doors and upper-floor logos.
// The width threshold is a consumer choice: 4m for doors, 1.2m for logos.
// Road visibility and physical neighbor obstruction are evaluated once here.
export function eligibleFacadeWalls(polygon,roads=[],otherBuildings=[],minWidth=0,blockedWalls=null){
 if(!Array.isArray(polygon)||polygon.length<3)return [];
 const area=polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
 const outward=area>=0?1:-1;
 const occluded=blockedWalls instanceof Set?blockedWalls:blockedBuildingWalls(polygon,otherBuildings);
 return polygon.map((a,i)=>{
  const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  const edge={i,len,mid:[(a[0]+b[0])/2,(a[1]+b[1])/2],
   normal:len?[outward*dz/len,-outward*dx/len]:[0,0]};
  const blocked=occluded.has(i);
  const road=len>0?roadFacing(edge,roads):null;
  const roadBlocked=!!road&&crossesFootprint(edge.mid,road.point,otherBuildings);
  return {...edge,blocked,road,roadBlocked,roadEligible:!!road&&!roadBlocked&&!blocked};
 }).filter(edge=>edge.len>=minWidth-1e-7&&!edge.blocked);
}

// Door-specific final selection preserves the existing longest contiguous run.
// If no road faces are available, non-obstructed wide walls remain eligible.
export function selectEntranceWall(polygon,roads=[],otherBuildings=[],doorWidth=4,blockedWalls=null){
 const candidates=eligibleFacadeWalls(polygon,roads,otherBuildings,doorWidth,blockedWalls);
 const roadCandidates=candidates.filter(edge=>edge.roadEligible);
 return middleEntranceEdge(roadCandidates.length?roadCandidates:candidates,polygon?.length||0);
}

// One logo for each distinct outward-facing direction, regardless of how many
// tiny OSM edges make up the facade. A 45-degree sector keeps curved corners
// from creating clusters of repeated logos while preserving perpendicular
// street faces. Match every wall to a chosen representative, not transitively
// to its neighbors (which could accidentally merge opposite street fronts).
const LOGO_SAME_DIRECTION_COS=Math.cos(Math.PI/4);
export function selectLogoWalls(polygon,roads=[],otherBuildings=[],blockedWalls=null){
 const candidates=eligibleFacadeWalls(polygon,roads,otherBuildings,1.2,blockedWalls);
 const roadCandidates=candidates.filter(edge=>edge.roadEligible);
 const sorted=(roadCandidates.length?roadCandidates:candidates)
  .sort((a,b)=>b.len-a.len||a.i-b.i);
 const selected=[];
 for(const edge of sorted){
  if(selected.some(other=>
   edge.normal[0]*other.normal[0]+edge.normal[1]*other.normal[1]
    >=LOGO_SAME_DIRECTION_COS-1e-9))continue;
  selected.push(edge);
 }
 return selected.map(edge=>edge.i);
}
