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
export function groupPoisByBuilding(buildings,labels){
 const result=new Map(),areas=new Map();
 for(const building of buildings){
  if(building.type!=='building'||building.osmId==null)continue;
  const key=building.osmType+':'+building.osmId;
  result.set(key,[]);
  areas.set(key,footprintArea(building.points));
 }
 for(const poi of labels){
  if(poi.kind!=='poi'||poi.osmId==null)continue;
  let best=null,bestArea=Infinity;
  for(const building of buildings){
   if(building.type!=='building'||building.osmId==null)continue;
   const [minX,maxX,minZ,maxZ]=building.bounds||[-Infinity,Infinity,-Infinity,Infinity];
   if(poi.x<minX||poi.x>maxX||poi.z<minZ||poi.z>maxZ)continue;
   if(!pointInFootprint(poi.x,poi.z,building.points))continue;
   const key=building.osmType+':'+building.osmId,area=areas.get(key);
   // For nested buildings choose the smallest containing footprint.
   if(area<bestArea){bestArea=area;best=key;}
  }
  if(best!==null)result.get(best).push(poi);
 }
 for(const shops of result.values())shops.sort((a,b)=>{
  const la=Number.parseFloat(a.tags?.level),lb=Number.parseFloat(b.tags?.level);
  if(Number.isFinite(la)&&Number.isFinite(lb)&&la!==lb)return la-lb;
  if(Number.isFinite(la)!==Number.isFinite(lb))return Number.isFinite(la)?-1:1;
  return a.name.localeCompare(b.name,'ja');
 });
 return result;
}
