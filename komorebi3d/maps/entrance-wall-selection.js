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

// A sign belongs to a continuous street-facing frontage, not to each
// individual OSM edge or an arbitrary compass direction. Consecutive curved
// edges form one frontage; a sharp building corner starts another one.
// Distant parallel facades stay independent; nearby hidden gaps may merge.
const FRONTAGE_CORNER_COS=Math.cos(70*Math.PI/180);
const SHORT_CONNECTOR_M=1;
const MAX_CONNECTOR_RUN_M=2;
const CONNECTOR_SAME_SIDE_COS=Math.cos(35*Math.PI/180);
function frontageGroups(edges,edgeCount){
 if(!edges.length||!Number.isInteger(edgeCount)||edgeCount<3)return [];
 const byIndex=new Map(edges.map(edge=>[edge.i,edge]));
 const next=i=>(i+1)%edgeCount,prev=i=>(i+edgeCount-1)%edgeCount;
 const forcedJoin=new Set(),forcedBreak=new Set();
 // Tiny OSM jogs can point almost sideways despite connecting two walls
 // facing the same direction. Compare the walls on BOTH sides of the jog.
 // A chamfer at a real corner must never merge perpendicular storefronts.
 for(const first of edges){
  if(first.len>=SHORT_CONNECTOR_M)continue;
  const before=byIndex.get(prev(first.i));
  if(!before||before.len<SHORT_CONNECTOR_M)continue;
  const run=[];let index=first.i,after=null;
  for(let n=0;n<edgeCount;n++,index=next(index)){
   const edge=byIndex.get(index);
   if(!edge)break;
   if(edge.len>=SHORT_CONNECTOR_M){after=edge;break;}
   run.push(edge);
  }
  if(!after||!run.length)continue;
  const span=run.reduce((sum,edge)=>sum+edge.len,0);
  if(span>MAX_CONNECTOR_RUN_M)continue;
  const alignment=before.normal[0]*after.normal[0]+before.normal[1]*after.normal[1];
  if(alignment>CONNECTOR_SAME_SIDE_COS){
   forcedJoin.add(before.i);
   for(const edge of run)forcedJoin.add(edge.i);
  }else if(alignment<=FRONTAGE_CORNER_COS){
   forcedBreak.add(run.at(-1).i);
  }
 }
 const joined=(i,j)=>{
  const a=byIndex.get(i),b=byIndex.get(j);
  if(!a||!b||forcedBreak.has(i))return false;
  return forcedJoin.has(i)||
   a.normal[0]*b.normal[0]+a.normal[1]*b.normal[1]>FRONTAGE_CORNER_COS;
 };
 const starts=edges.filter(edge=>!joined(prev(edge.i),edge.i));
 // A completely smooth closed outline is one continuous frontage.
 if(!starts.length)starts.push(edges.reduce((a,b)=>a.i<b.i?a:b));
 const visited=new Set(),groups=[];
 for(const start of starts){
  if(visited.has(start.i))continue;
  const run=[];
  for(let i=start.i;!visited.has(i);i=next(i)){
   const edge=byIndex.get(i);
   if(!edge)break;
   run.push(edge);visited.add(i);
   if(!joined(i,next(i)))break;
  }
  if(run.length)groups.push(run);
 }
 return groups;
}
function frontageRepresentative(drawable){
 // Count walls large enough to carry a readable sign, not tiny OSM
 // subdivisions. Pick the middle face (longer middle on even counts),
 // rather than the midpoint in metres dominated by one oversized wall.
 const comfortable=Math.min(3,Math.max(...drawable.map(edge=>edge.len)));
 return centralEdge(drawable.filter(edge=>edge.len>=comfortable-1e-8)).i;
}
// Collapse nearby fragments on the SAME road side, not every parallel wall.
// Short occlusions can split a frontage without creating another storefront.
const NEAR_SIDE_COS=Math.cos(25*Math.PI/180);
const NEAR_SIDE_GAP_M=7,NEAR_SIDE_OFFSET_M=6,NEAR_SIDE_ROAD_GAP_M=15;
function nearbyRoadSide(a,b,polygon){
 const x=a.wall,y=b.wall;
 if(!x.roadEligible||!y.roadEligible||
  x.normal[0]*y.normal[0]+x.normal[1]*y.normal[1]<NEAR_SIDE_COS)return false;
 const n=polygon.length;
 const gapAfter=(first,second)=>{
  let distance=0;
  for(let i=(first.run.at(-1).i+1)%n;i!==second.run[0].i;i=(i+1)%n){
   const p=polygon[i],q=polygon[(i+1)%n];
   distance+=Math.hypot(q[0]-p[0],q[1]-p[1]);
   if(distance>NEAR_SIDE_GAP_M)return distance;
  }
  return distance;
 };
 if(Math.min(gapAfter(a,b),gapAfter(b,a))>NEAR_SIDE_GAP_M)return false;
 const dx=y.mid[0]-x.mid[0],dz=y.mid[1]-x.mid[1];
 if(Math.abs(dx*x.normal[0]+dz*x.normal[1])>NEAR_SIDE_OFFSET_M)return false;
 return Math.hypot(x.road.point[0]-y.road.point[0],
  x.road.point[1]-y.road.point[1])<=NEAR_SIDE_ROAD_GAP_M;
}
function uniqueRoadFrontages(frontages,polygon){
 const kept=[];
 // Prefer the wider wall when two close fragments compete.
 const ranked=frontages.slice().sort((a,b)=>b.wall.len-a.wall.len||a.wall.i-b.wall.i);
 for(const candidate of ranked)
  if(!kept.some(other=>nearbyRoadSide(candidate,other,polygon)))kept.push(candidate);
 return kept.map(item=>item.wall.i).sort((a,b)=>a-b);
}
export function selectLogoWalls(polygon,roads=[],otherBuildings=[],blockedWalls=null){
 // Recognize whole contiguous frontages BEFORE asking whether each tiny OSM
 // wall individually faces the road. Otherwise a short / oblique middle wall
 // creates two separate signs on the sides of one continuous storefront.
 // Unblocked walls too short for a logo still bridge the visual frontage.
 const structure=eligibleFacadeWalls(polygon,roads,otherBuildings,0,blockedWalls);
 const groups=frontageGroups(structure,polygon?.length||0);
 const roadGroups=groups.filter(run=>run.some(edge=>edge.roadEligible));
 const selected=roadGroups.length?roadGroups:groups;
 const candidates=selected.flatMap(run=>{
  const drawable=run.filter(edge=>edge.len>=1.2);
  if(!drawable.length)return [];
  const i=frontageRepresentative(drawable);
  return [{run,wall:run.find(edge=>edge.i===i)}];
 });
 return uniqueRoadFrontages(candidates,polygon);
}
