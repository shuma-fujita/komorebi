// Accept ONLY closed area way geometry tagged amenity=parking.
// Point-only parking, underground, rooftop and multistorey sites need separate visuals.
const NON_SURFACE=new Set(['underground','multi-storey','multistorey','rooftop','garage','garages']);
export function parkingAreaFromOsm(element,projected,halfSize){
 if(element?.type!=='way'||element.tags?.amenity!=='parking'||!Array.isArray(projected)||projected.length<4)return null;
 if(NON_SURFACE.has(element.tags.parking)||element.tags.location==='underground')return null;
 if(!projected.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null;
 const first=projected[0],last=projected.at(-1);
 if(Math.hypot(first[0]-last[0],first[1]-last[1])>.5)return null;
 const points=[];
 for(const p of projected.slice(0,-1)){
  if(!points.length||Math.hypot(p[0]-points.at(-1)[0],p[1]-points.at(-1)[1])>.01)points.push(p);
 }
 if(points.length<3)return null;
 let twice=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  twice+=a[0]*b[1]-b[0]*a[1];
 }
 const area=Math.abs(twice)*.5;
 if(area<30||area>35000)return null;
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
 if(Math.min(...xs)>halfSize||Math.max(...xs)<-halfSize||Math.min(...zs)>halfSize||Math.max(...zs)<-halfSize)return null;
 return {points,area};
}
