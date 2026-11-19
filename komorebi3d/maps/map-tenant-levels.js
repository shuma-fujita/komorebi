// Infer floors from real OSM tenant nodes only when building metadata is missing.
// One spatial-index pass per map; the progressive renderer only reads this map.
const TENANT_TAGS=['shop','amenity','tourism','office','leisure','healthcare'];
const GRID_METRES=25;
function contains(x,z,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,az]=points[j],[bx,bz]=points[i];
  const cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
  if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&
     z>=Math.min(az,bz)-1e-7&&z<=Math.max(az,bz)+1e-7)return true;
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }
 return inside;
}
function maxTenantLevel(raw){
 if(raw===undefined||raw===null)return null;
 const values=String(raw).split(';').map(s=>s.trim());
 if(!values.length||values.some(s=>!/^\d+$/.test(s)))return null;
 const numbers=values.map(Number);
 return numbers.every(n=>Number.isSafeInteger(n)&&n>=0&&n<45)?Math.max(...numbers):null;
}
export function inferBuildingLevelsFromTenants(elements,project,halfSize){
 const cells=new Map(),results=new Map();
 const cellKey=(x,z)=>x+','+z;
 for(const e of elements){
  if(e.type!=='way'||!e.tags?.building||e.tags.building==='no'||!Array.isArray(e.geometry)||e.geometry.length<4)continue;
  const points=e.geometry.map(project);
  if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])>.5)continue;
  points.pop();
  if(points.length<3)continue;
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  if(minX>halfSize||maxX< -halfSize||minZ>halfSize||maxZ< -halfSize)continue;
  let twice=0;
  for(let i=0,j=points.length-1;i<points.length;j=i++)twice+=points[j][0]*points[i][1]-points[i][0]*points[j][1];
  const area=Math.abs(twice)/2;
  if(area<3||area>35000)continue;
  const building={id:e.id,points,minX,maxX,minZ,maxZ,area};
  for(let ix=Math.floor(minX/GRID_METRES);ix<=Math.floor(maxX/GRID_METRES);ix++)
   for(let iz=Math.floor(minZ/GRID_METRES);iz<=Math.floor(maxZ/GRID_METRES);iz++){
    const key=cellKey(ix,iz),list=cells.get(key);
    if(list)list.push(building);else cells.set(key,[building]);
   }
 }
 for(const e of elements){
  if(e.type!=='node'||!Number.isFinite(e.lat)||!Number.isFinite(e.lon)||
     !TENANT_TAGS.some(key=>e.tags?.[key]))continue;
  const level=maxTenantLevel(e.tags.level);
  if(level===null)continue;
  const [x,z]=project(e);
  if(Math.abs(x)>halfSize||Math.abs(z)>halfSize)continue;
  let owner=null;
  for(const building of cells.get(cellKey(Math.floor(x/GRID_METRES),Math.floor(z/GRID_METRES)))||[]){
   if(x<building.minX||x>building.maxX||z<building.minZ||z>building.maxZ||
      !contains(x,z,building.points))continue;
   if(!owner||building.area<owner.area)owner=building;
  }
  if(owner)results.set(owner.id,Math.max(results.get(owner.id)||0,level+1));
 }
 return results;
}
