// Camera-center ray against OSM building prisms. Pure geometry, no renderer dependency.
const EPS=1e-7;
function insidePolygon(x,z,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const cross=(x-a[0])*dz-(z-a[1])*dx;
  if(Math.abs(cross)<EPS&&x>=Math.min(a[0],b[0])-EPS&&x<=Math.max(a[0],b[0])+EPS&&
     z>=Math.min(a[1],b[1])-EPS&&z<=Math.max(a[1],b[1])+EPS)return true;
  if((a[1]>z)!==(b[1]>z)&&x<(dx*(z-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
 }
 return inside;
}
function intersectBuilding(building,eye,dir,maxDistance){
 const points=building.points,h=building.height;
 if(!Array.isArray(points)||points.length<3||!(h>0))return Infinity;
 const [ex,ey,ez]=eye,[dx,dy,dz]=dir;
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const [x,z] of points){
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
 }
 // Cheap three-dimensional bounding-box rejection before polygon-edge tests.
 let lo=0,hi=maxDistance;
 for(const [p,d,min,max] of [[ex,dx,minX,maxX],[ey,dy,0,h],[ez,dz,minZ,maxZ]]){
  if(Math.abs(d)<EPS){if(p<min||p>max)return Infinity;continue;}
  const a=(min-p)/d,b=(max-p)/d;
  lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
  if(lo>hi)return Infinity;
 }
 let nearest=Infinity;
 if(Math.abs(dy)>EPS){
  for(const y of [0,h]){
   const t=(y-ey)/dy;
   if(t>EPS&&t<=maxDistance&&insidePolygon(ex+t*dx,ez+t*dz,points))nearest=Math.min(nearest,t);
  }
 }
 // Wall intersection: ray XZ versus each footprint edge, then check wall height.
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],sx=b[0]-a[0],sz=b[1]-a[1];
  const den=dx*sz-dz*sx;
  if(Math.abs(den)<EPS)continue;
  const px=a[0]-ex,pz=a[1]-ez;
  const t=(px*sz-pz*sx)/den,u=(px*dz-pz*dx)/den;
  if(t<=EPS||t>maxDistance||u< -EPS||u>1+EPS)continue;
  const y=ey+t*dy;
  if(y>=-EPS&&y<=h+EPS)nearest=Math.min(nearest,t);
 }
 return nearest;
}
export function pickFocusedBuilding(buildings,camera,{maxDistance=200}={}){
 if(!camera?.eye||!camera?.target||!Array.isArray(buildings))return null;
 const eye=camera.eye,delta=camera.target.map((v,i)=>v-eye[i]);
 const length=Math.hypot(...delta);
 if(!(length>EPS))return null;
 const dir=delta.map(v=>v/length);
 let best=null,bestDistance=maxDistance;
 for(const building of buildings){
  if(building.type!=='building'||building.osmId==null)continue;
  const distance=intersectBuilding(building,eye,dir,bestDistance);
  if(distance<bestDistance){best=building;bestDistance=distance;}
 }
 return best;
}
