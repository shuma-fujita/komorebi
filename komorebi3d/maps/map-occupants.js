import {BUILDING_POI_OUTSIDE_TOLERANCE_METRES} from './building-poi-match-const.js?v=shared-outside-1m-20261119';
// Associate OSM POI nodes with the containing building footprint.
// Keep real OSM identities. Never infer tenancy from nearby names alone.
const EPS=1e-7;
export function pointInFootprint(x,z,points){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Array.isArray(points)||points.length<3)return false;
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,az]=points[j],[bx,bz]=points[i],cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
  if(Math.abs(cross)<EPS&&x>=Math.min(ax,bx)-EPS&&x<=Math.max(ax,bx)+EPS&&
     z>=Math.min(az,bz)-EPS&&z<=Math.max(az,bz)+EPS)return true;
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }
 return inside;
}
function footprintArea(points){
 let twice=0;
 for(let i=0,j=points.length-1;i<points.length;j=i++)twice+=points[j][0]*points[i][1]-points[i][0]*points[j][1];
 return Math.abs(twice)/2;
}
// Match the convenience 100cm exterior tolerance without claiming an outside
// POI belongs to an ambiguous pair of neighboring buildings.
export const TENANT_OUTSIDE_TOLERANCE_METRES=BUILDING_POI_OUTSIDE_TOLERANCE_METRES;
function footprintDistance(x,z,points){
 let shortest=Infinity;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const dx=b[0]-a[0],dz=b[1]-a[1],lengthSq=dx*dx+dz*dz;
  const t=lengthSq?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/lengthSq)):0;
  shortest=Math.min(shortest,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
 }
 return shortest;
}
export function shopsInFocusedBuilding(buildings,labels,focusedKey){
 const focused=buildings.find(b=>b.type==='building'&&b.osmType+':'+b.osmId===focusedKey);
 if(!focused)return [];
 const [minX,maxX,minZ,maxZ]=focused.bounds||[-Infinity,Infinity,-Infinity,Infinity];
 const result=[],focusedArea=focused.area??footprintArea(focused.points);
 for(const poi of labels){
  if(poi.kind!=='poi'||poi.osmId==null)continue;
  const inside=poi.x>=minX&&poi.x<=maxX&&poi.z>=minZ&&poi.z<=maxZ&&
   pointInFootprint(poi.x,poi.z,focused.points);
  if(inside){
   // Preserve existing nested-footprint ownership and normal tenant styling.
   const nested=buildings.some(b=>{
    if(b===focused||b.type!=='building')return false;
    const [a,c,d,e]=b.bounds||[-Infinity,Infinity,-Infinity,Infinity];
    if(poi.x<a||poi.x>c||poi.z<d||poi.z>e)return false;
    if((b.area??footprintArea(b.points))>=focusedArea)return false;
    return pointInFootprint(poi.x,poi.z,b.points);
   });
   if(!nested)result.push(poi);
   continue;
  }
  if(poi.x<minX-TENANT_OUTSIDE_TOLERANCE_METRES||poi.x>maxX+TENANT_OUTSIDE_TOLERANCE_METRES||
     poi.z<minZ-TENANT_OUTSIDE_TOLERANCE_METRES||poi.z>maxZ+TENANT_OUTSIDE_TOLERANCE_METRES||
     footprintDistance(poi.x,poi.z,focused.points)>TENANT_OUTSIDE_TOLERANCE_METRES)continue;
  // Containment takes priority everywhere. Only a single nearby footprint
  // may claim an outside POI, just as in the convenience renderer.
  let containing=false,nearby=0;
  for(const b of buildings){
   if(b.type!=='building'||!Array.isArray(b.points)||b.points.length<3)continue;
   const [a,c,d,e]=b.bounds||[-Infinity,Infinity,-Infinity,Infinity];
   if(poi.x>=a&&poi.x<=c&&poi.z>=d&&poi.z<=e&&pointInFootprint(poi.x,poi.z,b.points)){
    containing=true;break;
   }
   if(poi.x>=a-TENANT_OUTSIDE_TOLERANCE_METRES&&poi.x<=c+TENANT_OUTSIDE_TOLERANCE_METRES&&
      poi.z>=d-TENANT_OUTSIDE_TOLERANCE_METRES&&poi.z<=e+TENANT_OUTSIDE_TOLERANCE_METRES&&
      footprintDistance(poi.x,poi.z,b.points)<=TENANT_OUTSIDE_TOLERANCE_METRES){
    nearby++;
   }
  }
  if(!containing&&nearby===1)result.push({...poi,outsideFootprint:true});
 }
 result.sort((a,b)=>{
  const la=Number.parseFloat(a.tags?.level),lb=Number.parseFloat(b.tags?.level);
  if(Number.isFinite(la)&&Number.isFinite(lb)&&la!==lb)return lb-la;
  if(Number.isFinite(la)!==Number.isFinite(lb))return Number.isFinite(la)?-1:1;
  return a.name.localeCompare(b.name,'ja');
 });
 return result;
}
