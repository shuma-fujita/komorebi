// Floor-local rectangular shop districts. All geometry belongs to the app, not the pinned Engine.
// Unknown/malformed OSM levels do not claim a floor or a building.
import {matchStoreBuildings} from './store-matching.js?v=store-poi-brand-v1-20261122';
import {resolveConveniencePaint} from './convenience/osm-adapter.js?v=store-floor-zones-v1-20261123';
import {identifyLogoBrand} from './logos/osm-adapter.js?v=ground-glass-centered-upper-v1-20261123';
import {paintConvenienceGlazing,paintConvenienceSign} from './convenience/common.js?v=upper-vector-logo-only-v1-20261123';

const specs={
 mcdonalds:{color:0xdb0007},daiso:{color:0xf5008c},kaikatsu:{color:0xec661b},
 gusto:{color:0xffffff},bamiyan:{color:0xffffff},isomaru:{color:0xffffff,aspect:1.5,uv:[.5,.5]},
 torikizoku:{color:0xf5ca01},hoshino:{color:0x522f19,aspect:1.5}
};
const facility=['shop','amenity','tourism','office','leisure','healthcare'];
function identified(tags){return (identifyLogoBrand(tags)||facility.some(k=>tags?.[k]))&&
 String(tags?.['name:ja']||tags?.name||tags?.['brand:ja']||tags?.brand||'').trim()
 ?{id:'unbranded',sign:null}:null;}
// Map any named facility through the same 1m, unambiguous footprint matcher.
export function matchFloorTenants(elements,project,halfSize,convenience,food){
 const all=matchStoreBuildings(elements,project,halfSize,identified);
 const specialized=new Map();
 for(const group of [convenience,food])for(const [building,stores] of group)
  for(const store of stores){if(!specialized.has(building))specialized.set(building,new Map());
   specialized.get(building).set(store.osmId,store.brand);}
 for(const [building,stores] of all)for(const store of stores)
  store.brand=identifyLogoBrand(store.tags)||specialized.get(building)?.get(store.osmId)||store.brand;
 return all;
}
function floorNumber(bottom,top){return (bottom+top)/2;}
export function floorDistricts(stores,tags,height,inferredLevels){
 const floors=new Map();
 for(const store of stores||[]){
  for(const span of resolveConveniencePaint([store],tags,height,inferredLevels)){
   const key=span.bottom.toFixed(7)+':'+span.top.toFixed(7);
   if(!floors.has(key))floors.set(key,{bottom:span.bottom,top:span.top,stores:[]});
   floors.get(key).stores.push(store);
  }
 }
 return [...floors.values()].sort((a,b)=>a.bottom-b.bottom);
}
function districts(rect,entries){
 if(entries.length===1)return [{rect,store:entries[0]}];
 // Axis-aligned recursive split. Groups nearest POIs together; balanced area
 // provides equal-size rectangular units even when POIs cluster in one corner.
 const xRange=Math.max(...entries.map(e=>e.point[0]))-Math.min(...entries.map(e=>e.point[0]));
 const zRange=Math.max(...entries.map(e=>e.point[1]))-Math.min(...entries.map(e=>e.point[1]));
 const axis=xRange/(rect.x1-rect.x0||1)>=zRange/(rect.z1-rect.z0||1)?0:1;
 const sorted=[...entries].sort((a,b)=>a.point[axis]-b.point[axis]||a.osmId-b.osmId);
 const count=Math.floor(sorted.length/2),ratio=count/sorted.length;
 const cut=axis===0?rect.x0+(rect.x1-rect.x0)*ratio:rect.z0+(rect.z1-rect.z0)*ratio;
 const left=axis===0?{...rect,x1:cut}:{...rect,z1:cut};
 const right=axis===0?{...rect,x0:cut}:{...rect,z0:cut};
 return [...districts(left,sorted.slice(0,count)),...districts(right,sorted.slice(count))];
}
// Parametric clipping of a building edge against an axis-aligned shop rectangle.
function clipEdge(a,b,rect){
 const dx=b[0]-a[0],dz=b[1]-a[1];let t0=0,t1=1;
 for(const [p,q] of [[-dx,a[0]-rect.x0],[dx,rect.x1-a[0]],[-dz,a[1]-rect.z0],[dz,rect.z1-a[1]]]){
  if(Math.abs(p)<1e-10){if(q< -1e-7)return null;continue;}
  const r=q/p;if(p<0)t0=Math.max(t0,r);else t1=Math.min(t1,r);
 }
 if(t1-t0<1e-6)return null;
 return {a:[a[0]+dx*t0,a[1]+dz*t0],b:[a[0]+dx*t1,a[1]+dz*t1],i:null};
}
function closestSegment(point,parts){
 let best=null,dist=Infinity;
 for(const p of parts){
  const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len2=dx*dx+dz*dz;
  if(len2<16)continue;
  const u=Math.max(0,Math.min(1,((point[0]-p.a[0])*dx+(point[1]-p.a[1])*dz)/len2));
  const d=Math.hypot(point[0]-p.a[0]-dx*u,point[1]-p.a[1]-dz*u);
  if(d<dist){dist=d;best=p;}
 }
 return best;
}
function emitUV(surface,points,uv){
 for(const j of [0,1,2,0,2,3]){surface.positions.push(...points[j]);surface.uvs.push(...uv[j]);}
}
function groupsFor(store,floors){
 const own=floors.filter(f=>f.stores.includes(store)&&f.bottom>1e-7);
 const groups=[];
 for(const f of own){
  const g=groups.at(-1);
  if(g&&Math.abs(g.top-f.bottom)<1e-7)g.top=f.top;
  else groups.push({bottom:f.bottom,top:f.top});
 }
 return groups;
}
function drawPart(quad,mesh,p,span,store,entrance,centerY,texturedFaces,ownerKey,outward){
 const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len=Math.hypot(dx,dz);
 if(len<.12)return;
 const point=(u,y,off=0)=>[p.a[0]+dx*u/len+outward*dz/len*off,y,
  p.a[1]+dz*u/len-outward*dx/len*off];
 const rect=(u0,u1,y0,y1,c,offset=0)=>{
  if(u1<=u0+1e-8||y1<=y0+1e-8)return;
  quad(mesh,point(u0,y0,.07+offset),point(u1,y0,.07+offset),
   point(u1,y1,.07+offset),point(u0,y1,.07+offset),c);
 };
 const spec=specs[store.brand.id],color=spec?.color??store.brand.sign?.background??0xe3e6e8;
 rect(0,len,span.bottom,span.top,color);
 const ground=span.bottom<1e-7;
 if(ground){
  const fasciaBottom=span.top-(span.top-span.bottom)*.2;
  if(store.brand.sign){
   paintConvenienceSign(rect,(a,b,c,d,t)=>quad(mesh,a,b,c,d,t),
    (u,y,offset=0)=>point(u,y,.07+offset),store.brand.sign,
    {length:len,bottom:fasciaBottom,top:span.top,entrance});
  }
  paintConvenienceGlazing(rect,{length:len,bottom:span.bottom,top:fasciaBottom,
   side:entrance?'front':'side',backWall:false});
  if(!spec&&!store.brand.sign)rect(0,len,fasciaBottom,span.top,0xe3e6e8,.01);
 }
 if(spec){
  const uvBg=spec.uv||[.04,.04],surface={texture:store.brand.id,ownerKey,positions:[],uvs:[]};
  const textured=(a,b,y0,y1,uv)=>{
   if(b-a<1e-7||y1-y0<1e-7)return;
   emitUV(surface,[point(a,y0,.08),point(b,y0,.08),point(b,y1,.08),point(a,y1,.08)],uv);
  };
  const solid=[uvBg,uvBg,uvBg,uvBg];
  if(!ground&&centerY===null){textured(0,len,span.bottom,span.top,solid);}
  else{
   const h=ground?(span.top-span.bottom)*.19:2.65;
   const width=h*(spec.aspect||1),x0=(len-width)/2,x1=x0+width;
   const cy=ground?span.top-(span.top-span.bottom)*.1:centerY;
   const y0=cy-h/2,y1=cy+h/2;
   const xa=Math.max(0,x0),xb=Math.min(len,x1),ya=Math.max(span.bottom,y0),yb=Math.min(span.top,y1);
   textured(0,Math.max(0,xa),span.bottom,span.top,solid);
   textured(Math.min(len,Math.max(0,xb)),len,span.bottom,span.top,solid);
   if(xb>xa&&yb>ya){
    textured(xa,xb,span.bottom,ya,solid);
    textured(xa,xb,yb,span.top,solid);
    const clamp01=n=>Math.max(0,Math.min(1,n));
    const u0=clamp01((xa-x0)/width),u1=clamp01((xb-x0)/width);
    const v0=clamp01((ya-y0)/h),v1=clamp01((yb-y0)/h);
    const uv=outward>0?[[1-u0,v0],[1-u1,v0],[1-u1,v1],[1-u0,v1]]:
     [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    textured(xa,xb,ya,yb,uv);
   }else textured(Math.max(0,xa),Math.min(len,Math.max(0,xb)),span.bottom,span.top,solid);
  }
  if(surface.positions.length)texturedFaces.push(surface);
 }else if(!ground&&store.brand.sign&&centerY!==null){
  const h=Math.min(1.3,span.top-span.bottom-.2),w=Math.min(3.7,len-.1);
  if(w>=2.7){
   const start=(len-w)/2,fasciaBottom=Math.max(span.bottom,centerY-h/2),fasciaTop=Math.min(span.top,centerY+h/2);
   const localRect=(a,b,c,d,color,off=0)=>rect(start+a,start+b,c,d,color,.025+off);
   paintConvenienceSign(localRect,(a,b,c,d,t)=>quad(mesh,a,b,c,d,t),
    (u,y,off=0)=>point(start+u,y,.095+off),store.brand.sign,
    {length:w,bottom:fasciaBottom,top:fasciaTop,entrance:true,doorWidth:w});
  }
 }
}
export function paintFloorDistricts(quad,mesh,polygon,floors,texturedFaces,ownerKey,allFloors=floors){
 if(!floors?.length)return 0;
 const rect={x0:Math.min(...polygon.map(p=>p[0])),x1:Math.max(...polygon.map(p=>p[0])),
  z0:Math.min(...polygon.map(p=>p[1])),z1:Math.max(...polygon.map(p=>p[1]))};
 let signed=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];signed+=a[0]*b[1]-b[0]*a[1];}
 const outward=Math.sign(signed)||1;
 const allStores=[...new Set(allFloors.flatMap(f=>f.stores))],centers=new Map();
 for(const s of allStores)centers.set(s,groupsFor(s,allFloors));
 let count=0;
 for(const f of floors){
  for(const zone of districts(rect,f.stores)){
   const parts=[];
   for(let i=0;i<polygon.length;i++){
    const clip=clipEdge(polygon[i],polygon[(i+1)%polygon.length],zone.rect);
    if(clip){clip.i=i;parts.push(clip);}
   }
   if(!parts.length)continue;
   const entrance=f.bottom<1e-7?closestSegment(zone.store.point,parts):null;
   const group=centers.get(zone.store)?.find(g=>f.bottom>=g.bottom-1e-7&&f.top<=g.top+1e-7);
   const cy=group?(group.bottom+group.top)/2:null;
   for(const part of parts)drawPart(quad,mesh,part,f,zone.store,part===entrance,cy,
    texturedFaces,ownerKey,outward);
   count++;
  }
 }
 return count;
}
