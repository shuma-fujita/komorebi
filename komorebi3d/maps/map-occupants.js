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
export function shopsInFocusedBuilding(buildings,labels,focusedKey){
 const focused=buildings.find(b=>b.type==='building'&&b.osmType+':'+b.osmId===focusedKey);
 if(!focused)return [];
 const [minX,maxX,minZ,maxZ]=focused.bounds||[-Infinity,Infinity,-Infinity,Infinity];
 const result=[],focusedArea=footprintArea(focused.points);
 for(const poi of labels){
  if(poi.kind!=='poi'||poi.osmId==null||poi.x<minX||poi.x>maxX||poi.z<minZ||poi.z>maxZ||
     !pointInFootprint(poi.x,poi.z,focused.points))continue;
  // A shop in a nested, smaller building belongs to that building.
  const nested=buildings.some(b=>{
   if(b===focused||b.type!=='building'||footprintArea(b.points)>=focusedArea)return false;
   const [a,c,d,e]=b.bounds||[-Infinity,Infinity,-Infinity,Infinity];
   return poi.x>=a&&poi.x<=c&&poi.z>=d&&poi.z<=e&&pointInFootprint(poi.x,poi.z,b.points);
  });
  if(!nested)result.push(poi);
 }
 result.sort((a,b)=>{
  const la=Number.parseFloat(a.tags?.level),lb=Number.parseFloat(b.tags?.level);
  if(Number.isFinite(la)&&Number.isFinite(lb)&&la!==lb)return la-lb;
  if(Number.isFinite(la)!==Number.isFinite(lb))return Number.isFinite(la)?-1:1;
  return a.name.localeCompare(b.name,'ja');
 });
 return result;
}
