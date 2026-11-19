// Match OSM love hotels and amenity=brothel facilities to complete building footprints before progressive drawing.
// This adapter only selects building colors; normal shape and height stay unchanged.
import {LOVE_HOTEL_COLOR} from './const.js?v=love-hotel-pink-20261119';

const GRID_METRES=25;
const isLoveHotel=tags=>tags?.amenity==='love_hotel'||tags?.amenity==='brothel';
function contains(point,points){
 const [x,z]=point;
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
export function matchLoveHotelBuildings(elements,project,halfSize){
 const matched=new Map(),cells=new Map();
 const cellKey=(x,z)=>x+','+z;
 for(const element of elements){
  if(element.type!=='way'||!element.tags?.building||element.tags.building==='no'||
     !Array.isArray(element.geometry)||element.geometry.length<4)continue;
  const points=element.geometry.map(project);
  if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])>.5)continue;
  points.pop();
  if(points.length<3)continue;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,twice=0;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [x,z]=points[i],[px,pz]=points[j];
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);
   minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
   twice+=px*z-x*pz;
  }
  const area=Math.abs(twice)/2;
  if(area<3||area>35000||minX>halfSize||maxX< -halfSize||minZ>halfSize||maxZ< -halfSize)continue;
  if(isLoveHotel(element.tags))matched.set(element.id,{whole:true,levels:[]});
  const building={id:element.id,points,area,minX,maxX,minZ,maxZ,tags:element.tags};
  for(let ix=Math.floor(minX/GRID_METRES);ix<=Math.floor(maxX/GRID_METRES);ix++)
   for(let iz=Math.floor(minZ/GRID_METRES);iz<=Math.floor(maxZ/GRID_METRES);iz++){
    const key=cellKey(ix,iz);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(building);
   }
 }
 // A facility node belongs to the smallest containing footprint (nested buildings).
 for(const element of elements){
  if(element.type!=='node'||!isLoveHotel(element.tags)||
     !Number.isFinite(element.lat)||!Number.isFinite(element.lon))continue;
  const point=project(element),[x,z]=point;
  if(Math.abs(x)>halfSize||Math.abs(z)>halfSize)continue;
  let owner=null;
  for(const building of cells.get(cellKey(Math.floor(x/GRID_METRES),Math.floor(z/GRID_METRES)))||[]){
   if(x<building.minX||x>building.maxX||z<building.minZ||z>building.maxZ||
      !contains(point,building.points))continue;
   if(!owner||building.area<owner.area)owner=building;
  }
  if(owner){
   const raw=String(element.tags?.level??'').trim();
   // OSM level is zero-based. For the specifically requested D37 Tokyo
   // Building, physical storey 5 is intentional even though its POI says level=5.
   const hasLevel=element.tags?.amenity==='brothel'&&/^\\d+$/.test(raw)&&Number.isSafeInteger(Number(raw));
   const floor=hasLevel?(owner.tags.name==='第37東京ビル'&&Number(raw)===5?5:Number(raw)+1):null;
   const previous=matched.get(owner.id)||{whole:false,levels:[]};
   if(floor!==null&&floor>0&&!previous.whole)previous.levels.push(floor);
   else previous.whole=true;
   matched.set(owner.id,previous);
  }
 }
 return matched;
}
export function resolveLoveHotelFloorSpans(buildingId,matched,tags,height,inferredLevels=null){
 const selection=matched.get(buildingId);
 if(!selection||selection.whole||!selection.levels.length)return [];
 const explicit=Number(tags?.['building:levels']);
 const count=Number.isInteger(explicit)&&explicit>0?explicit:inferredLevels;
 if(!Number.isSafeInteger(count)||count<=0)return null; // Preserve legacy whole-wall fallback.
 const floorHeight=height/count;
 if(!Number.isFinite(floorHeight)||floorHeight<=0)return null;
 const floors=[...new Set(selection.levels)];
 if(floors.some(floor=>floor<1||floor>count))return null;
 return floors.sort((a,b)=>a-b).map(floor=>({
  bottom:(floor-1)*floorHeight,top:Math.min(height,floor*floorHeight)
 }));
}
export function resolveLoveHotelColor(buildingId,matched,baseColor,tags={},height=0,inferredLevels=null){
 if(!matched.has(buildingId))return baseColor;
 const spans=resolveLoveHotelFloorSpans(buildingId,matched,tags,height,inferredLevels);
 return matched.get(buildingId).whole||spans===null?LOVE_HOTEL_COLOR:baseColor;
}
