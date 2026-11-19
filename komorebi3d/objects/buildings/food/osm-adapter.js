// Identify restaurant POIs and map them to real OSM building footprints.
import {BUILDING_POI_OUTSIDE_TOLERANCE_METRES} from '../../../maps/building-poi-match-const.js?v=shared-outside-1m-20261119';
import {resolveConveniencePaint} from '../convenience/osm-adapter.js?v=lawson-storefront-20261119';
import {yoshinoya} from './yoshinoya.js?v=food-storefront-20261119';
import {hidakaya} from './hidakaya.js?v=food-storefront-20261119';
const brands=[yoshinoya,hidakaya];
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s\u2010-\u2015\u2212\uff0d-]/g,'');
function identifyFood(tags){
 if(!['fast_food','restaurant'].includes(tags?.amenity))return null;
 const names=[tags?.['brand:ja'],tags?.brand,tags?.['brand:en'],tags?.['name:ja'],tags?.name,tags?.['name:en']];
 return brands.find(brand=>names.some(v=>{const n=normalize(v);return n&&brand.names.some(alias=>n.startsWith(normalize(alias)));}))||null;
}
function inside(point,points){
 const [x,z]=point;let result=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,az]=points[i],[bx,bz]=points[j];
  const cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
  if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&z>=Math.min(az,bz)-1e-7&&z<=Math.max(az,bz)+1e-7)return true;
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)result=!result;
 }
 return result;
}
function outsideDistance(point,poly){
 let closest=Infinity;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
  closest=Math.min(closest,Math.hypot(point[0]-a[0]-dx*t,point[1]-a[1]-dz*t));
 }
 return closest;
}
export function matchFoodBuildings(elements,project,halfSize){
 const buildings=[];
 for(const element of elements){
  if(element.type!=='way'||!element.tags?.building||element.tags.building==='no'||!Array.isArray(element.geometry)||element.geometry.length<4)continue;
  const points=element.geometry.map(project);
  if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])>.5)continue;
  points.pop();if(points.length<3)continue;
  let twice=0;for(let i=0,j=points.length-1;i<points.length;j=i++)twice+=points[j][0]*points[i][1]-points[i][0]*points[j][1];
  const area=Math.abs(twice)/2;if(area<3||area>35000)continue;
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  if(minX>halfSize||maxX< -halfSize||minZ>halfSize||maxZ< -halfSize)continue;
  buildings.push({id:element.id,points,area,minX,maxX,minZ,maxZ});
 }
 const matched=new Map(),tolerance=BUILDING_POI_OUTSIDE_TOLERANCE_METRES;
 for(const element of elements){
  if(element.type!=='node'||!Number.isFinite(element.lat)||!Number.isFinite(element.lon))continue;
  const brand=identifyFood(element.tags);if(!brand)continue;
  const point=project(element);
  if(Math.abs(point[0])>halfSize||Math.abs(point[1])>halfSize)continue;
  let owner=null;
  for(const b of buildings){
   if(point[0]<b.minX||point[0]>b.maxX||point[1]<b.minZ||point[1]>b.maxZ)continue;
   if(inside(point,b.points)&&(!owner||b.area<owner.area))owner=b;
  }
  if(!owner&&tolerance>0){
   const near=buildings.filter(b=>point[0]>=b.minX-tolerance&&point[0]<=b.maxX+tolerance&&point[1]>=b.minZ-tolerance&&point[1]<=b.maxZ+tolerance&&outsideDistance(point,b.points)<=tolerance);
   if(near.length===1)owner=near[0];
  }
  if(!owner)continue;
  if(!matched.has(owner.id))matched.set(owner.id,[]);
  matched.get(owner.id).push({brand,level:element.tags?.level});
 }
 return matched;
}
// Same physical floor-spanning rules and missing-level fallback as convenience.
export function resolveFoodPaint(stores,tags,height,inferredLevels=null){
 return resolveConveniencePaint(stores,tags,height,inferredLevels);
}
