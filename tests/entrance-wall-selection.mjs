#!/usr/bin/env node
import assert from 'node:assert/strict';
import {assessFacadeWalls,facadeRoadRank,middleEntranceEdge,selectEntranceWall,blockedBuildingWalls,eligibleFacadeWalls,selectLogoWalls} from '../komorebi3d/maps/entrance-wall-selection.js';
import {paintImageFacade} from '../komorebi3d/objects/buildings/brand-facade.js';
const e=(i,len)=>({i,len});
assert.equal(middleEntranceEdge([e(0,8),e(1,7),e(2,9)],4),1,'Three continuous edges: middle');
assert.equal(middleEntranceEdge([e(0,8),e(1,7),e(2,9),e(3,6)],4),2,
 'Four continuous edges: longer of two middle faces');
assert.equal(middleEntranceEdge([e(0,8),e(1,9),e(2,9),e(3,6)],4),1,
 'Equal middle lengths: deterministic first wins');
assert.equal(middleEntranceEdge([e(2,7)],5),2,'One eligible edge always gets door');
assert.equal(middleEntranceEdge([e(0,5),e(1,8)],5),1,'Two edges choose longer middle');
assert.equal(middleEntranceEdge([e(5,7),e(0,9),e(1,6)],6),0,
 'Continuous edges wrap around polygon boundary');
assert.equal(middleEntranceEdge([e(0,5),e(1,7),e(4,4),e(5,5)],7),1,
 'Longest run wins before central selection');
assert.equal(middleEntranceEdge([e(0,5),e(1,7),e(4,8),e(5,5)],7),4,
 'Equal run counts prefer larger sum of wall widths');
assert.equal(middleEntranceEdge([],5),-1,'No valid edges returns no entrance');
const square=[[0,0],[20,0],[20,20],[0,20]];
assert.equal(selectEntranceWall(square,[],[],4),1,
 'No roads: still choose a single central edge; never old road-distance ranking');
assert.equal(selectEntranceWall(square,[[[-10,-8],[30,-8]]],[],4),0,
 'Only road-facing south wall is eligible');
const eastNeighbor=[[20.3,0],[24,0],[24,20],[20.3,20]];
const blocked=blockedBuildingWalls(square,[eastNeighbor]);
assert.deepEqual([...blocked],[1],'East wall is shared physical obstruction for door and windows');
assert.equal(selectEntranceWall(square,[],[eastNeighbor],4,blocked),3,
 'Reusing blocked walls preserves entrance selection');
// Reuse the exact same candidate assessment for doors and logos.
// The east wall is blocked; north/south/west are accessible.
const westRoad=[[[-10,3],[-10,17]]];
const candidates=eligibleFacadeWalls(square,westRoad,[eastNeighbor],1.2,blocked);
assert.deepEqual(candidates.map(w=>w.i),[0,2,3],'No obstructed wall may be a candidate');
assert.deepEqual(candidates.filter(w=>w.roadEligible).map(w=>w.i),[3],
 'West-facing road remains eligible even when east face is longer');
assert.deepEqual(selectLogoWalls(square,westRoad,[eastNeighbor],blocked),[0,2,3],
 'An unobstructed direction does not require a road');
assert.deepEqual(selectLogoWalls(square,westRoad,[]),[0,1,2,3],
 'A detached square has one logo per exposed direction even with just one road');
assert.deepEqual(selectLogoWalls(square,[],[eastNeighbor],blocked),[0,2,3],
 'Missing road information falls back to accessible facade walls');
assert.equal(selectEntranceWall(square,westRoad,[eastNeighbor],4,blocked),3,
 'The unchanged door chooser uses the same road/obstruction candidates');
assert.equal(selectEntranceWall(square,[[[-10,3],[-10,17]]],[eastNeighbor],4,blocked),3,
 'Road with opposite direction still selects the same door face');

// Typed road centerlines carry the actual rendered widths.
const gray=(a,b,width=5.5)=>[a,b,{pedestrian:false,width}];
const walk=(a,b,width=2.2)=>[a,b,{pedestrian:true,width}];
const southWalk=walk([0,-2],[20,-2]);
const southGray=gray([0,-6],[20,-6]);
const eastGray=gray([23,0],[23,20]);
const northWalk=walk([0,22],[20,22]);
assert.equal(selectEntranceWall(square,[southWalk,southGray,eastGray,northWalk]),1,
 'Direct vehicle-facing east beats south with a connecting sidewalk and north footway');
assert.equal(selectEntranceWall(square,[southWalk,southGray,northWalk]),0,
 'Connected sidewalk wins over isolated footway even when equally near');
assert.equal(selectEntranceWall(square,[southWalk,gray([0,-14],[20,-14]),eastGray]),1,
 'A gap between sidewalk and distant vehicle road is not a connection');
assert.equal(selectEntranceWall(square,[southWalk,southGray,walk([-2,0],[-2,20])]),0,
 'An isolated path cannot win a contiguous run over the connected face');
assert.equal(selectEntranceWall(square,[gray([0,-6],[20,-6],10),northWalk]),0,
 'Wide vehicle strip is directly adjacent despite the distant centerline');
assert.equal(selectEntranceWall(square,[southWalk,southGray,eastGray],[eastNeighbor]),0,
 'A physically blocked vehicle-facing wall cannot host the door');
assert.equal(selectEntranceWall(square,[southWalk,southGray,eastGray].map(([a,b,s])=>[b,a,s])),1,
 'Road geometry direction does not change priority');
assert.deepEqual(selectLogoWalls(square,[southWalk,southGray,eastGray,northWalk]),
 selectLogoWalls(square,[southWalk,southGray,eastGray,northWalk].map(([a,b])=>[a,b])),
 'Typed road metadata must not change upper-floor logo selection');
assert.equal(selectEntranceWall(square,[southWalk]),0,'No gray road: retain existing walk-facing fallback');
const separatedByBuilding=[[2,-5],[18,-5],[18,-4],[2,-4]];
assert.equal(selectEntranceWall(square,[southWalk,southGray,northWalk,
 gray([0,26],[20,26])],[separatedByBuilding]),2,
 'A vehicle road behind another building cannot create a high-priority connection');

// OSM may split one road side into many nearly parallel pieces. That
// creates ONE visual logo direction, never one logo per footprint edge.
const subdivided=[[0,0],[3,0],[9,1],[20,1],[20,15],[0,15]];
assert.deepEqual(selectLogoWalls(subdivided,[],[]).sort((a,b)=>a-b),[1,3,4,5],
 'Without road data, separate building corners retain independent frontages');
assert.deepEqual(selectLogoWalls(subdivided,[[[-10,-8],[30,-8]]],[]),[1,3,4,5],
 'Multiple south-facing road edges produce only one central logo');
const sameSide=eligibleFacadeWalls(subdivided,[],[],1.2).filter(x=>[0,1,2].includes(x.i));
assert.ok(sameSide.length===3&&
 sameSide.every(e=>e.normal[0]*sameSide[0].normal[0]+
  e.normal[1]*sameSide[0].normal[1]>.9),
 'Split OSM walls share a similar outward direction');
// A smooth many-sided polygon is one visual frontage unless road eligibility
// or sharp building corners separate it. We do not force one per compass angle.
const hexagon=Array.from({length:6},(_,i)=>{
 const angle=2*Math.PI*i/6;
 return [20*Math.cos(angle),20*Math.sin(angle)];
});
assert.equal(selectLogoWalls(hexagon,[],[]).length,1,
 'Smooth cyclic facade produces one logo, even across several directions');
assert.deepEqual(selectLogoWalls(hexagon,[],[],new Set([0,2,4])).sort((a,b)=>a-b),[1,3,5],
 'Occluded edges split otherwise smooth facade into three separate frontages');

// Lawson/Hoshino style: a gently curved street frontage made from five
// OSM wall segments. A prominent central logo, not repeated end logos.
const curved=[[0,0],[8,0],[13,-2],[18,-2],[23,0],[31,0],[31,18],[0,18]];
const curvedRoad=[[[-6,-10],[38,-10]]];
assert.deepEqual(selectLogoWalls(curved,curvedRoad,[]),[2,5,6,7],
 'Curved frontage retains its central sign and other exposed directions');
const curvedFaces=[];
assert.equal(paintImageFacade(()=>{},{},curved,{
 bottom:3,top:6,texture:'test',backgroundColor:0x0066aa,texturedFaces:curvedFaces,
 logoWallIndices:selectLogoWalls(curved,curvedRoad,[])
}),true);
assert.equal(curvedFaces[0].uvs.filter((v,i)=>i%12===0&&v===1).length,4,
 'Actual curved facade places one UV logo per selected direction, not one per bend');
// Reproduction of the missing center-frontage logo: short OSM connector
// walls break the old (filter-to-1.2m FIRST) algorithm into two logos even
// though the entire street-facing wall is one continuous, gentle frontage.
const bridge=[[0,0],[8,0],[8.5,-.12],[9,-.2],[9.5,-.12],[10,0],
 [18,0],[18,12],[0,12]];
const bridgeRoad=[[[-8,-9],[27,-9]]];
const bridgeRoadEligible=eligibleFacadeWalls(bridge,bridgeRoad,[],1.2)
 .filter(edge=>edge.roadEligible).map(edge=>edge.i);
assert.ok(bridgeRoadEligible.includes(0)&&bridgeRoadEligible.includes(5),
 'Two large sides are independently road-facing');
assert.ok(!bridgeRoadEligible.some(i=>i>=1&&i<=4),
 'Tiny middle walls are individually ineligible for logo placement');
const bridged=selectLogoWalls(bridge,bridgeRoad,[]);
assert.equal(bridged.length,4,
 'Tiny center connector walls must not split one shop front into two logos');
assert.ok(bridged.filter(i=>[0,5].includes(i)).length===1,
 'The representative remains on a wall wide enough for a real logo');
const bridgeFaces=[];
paintImageFacade(()=>{}, {},bridge,{
 bottom:3,top:6,texture:'test',backgroundColor:0x664422,
 texturedFaces:bridgeFaces,logoWallIndices:bridged
});
assert.equal(bridgeFaces[0].uvs.filter((v,i)=>i%12===0&&v===1).length,4,
 'Actual storefront texture has one logo per exposed direction including the bridged frontage');

// Real Matsudo Geofabrik footprint (13 sides, metres relative to its POI).
// The 0.44m sideways jog must join parallel neighbours; only the central
// sufficiently wide face gets a sign. No store ID or name enters production logic.
const irregular=[[1.011,16.754],[6.385,-2.772],[2.845,-9.117],[1.463,-9.462],
 [1.535,-9.896],[-2.240,-10.631],[-2.438,-10.186],[-3.305,-10.375],
 [-6.114,1.558],[-5.066,1.870],[-6.032,5.622],[-5.445,5.855],[-7.495,14.817]];
const irregularRoads=[[[8.4,4.4],[9.9,6.6]],[[-51.8,-24.7],[3.1,-11.5]],
 [[3.1,-11.5],[7,-8.8]],[[7,-8.8],[9,-5.4]],
 [[8.4,4.4],[4.1,19.9]],[[5.2,10.8],[8,1.2]]];
const irregularBlocked=new Set([7,9,11,12]);
const irregularLogos=selectLogoWalls(irregular,irregularRoads,[],irregularBlocked);
assert.deepEqual(irregularLogos,[1],
 'Tiny sharp jogs between near-parallel faces form one frontage with a middle logo');
assert.equal(selectEntranceWall(irregular,irregularRoads,[],4,irregularBlocked),0,
 'Logo grouping does not alter the existing automatic door selector');
const irregularFaces=[];
paintImageFacade(()=>{}, {},irregular,{
 bottom:3,top:6,texture:'test',backgroundColor:0x664422,
 texturedFaces:irregularFaces,blockedWalls:irregularBlocked,
 logoWallIndices:irregularLogos
});
// Either OSM winding produces one complete UV logo; the first U differs.
const logoUVPatterns=new Set(['1,0,0,0,0,1,1,0,0,1,1,1',
 '0,0,1,0,1,1,0,0,1,1,0,1']);
let irregularLogoCount=0;
for(let i=0;i<irregularFaces[0].uvs.length;i+=12)
 if(logoUVPatterns.has(irregularFaces[0].uvs.slice(i,i+12).join(',')))
  irregularLogoCount++;
assert.equal(irregularLogoCount,1,
 'Real irregular footprint emits one logo UV surface regardless of winding');

// Real OSM way 130218292 (AMS BLDG.), rounded local metre geometry.
// Face 9 is a close duplicate of face 11 across blocked face 10 (5m).
// Face 5 belongs to another road direction and keeps its own logo.
const amsOutline=[[0,0],[-9.04,-2.46],[-8.96,-2.93],[-14.37,-4.9],
 [-14.63,-4],[-29.36,-8.62],[-26.87,-17.32],[-6.32,-11.34],
 [-6.04,-12.16],[-2,-10.92],[-2.5,-8.93],[2.31,-7.56]];
const amsRoads=[[[-47.34,27.36],[-34.35,-15.85]],
 [[11.55,-27.45],[-3.53,24.2]]];
const amsBlocked=new Set([0,2,4,8,10]);
// This reduced fixture omits surrounding buildings; the north-facing wall
// remains eligible unless its road line is obstructed, as in the real tile.
const amsLogos=selectLogoWalls(amsOutline,amsRoads,[],amsBlocked);
assert.deepEqual(amsLogos,[5,6,11],
 'Same-direction logos merge without losing another exposed direction');
const amsFaces=[];
paintImageFacade(()=>{}, {},amsOutline,{bottom:3,top:6,
 texture:'test',backgroundColor:0xf5ca01,texturedFaces:amsFaces,
 blockedWalls:amsBlocked,logoWallIndices:amsLogos});
let amsUVs=0;
for(let i=0;i<amsFaces[0].uvs.length;i+=12)
 if(logoUVPatterns.has(amsFaces[0].uvs.slice(i,i+12).join(',')))amsUVs++;
assert.equal(amsUVs,3,'Three exposed directions remain in the reduced fixture');

// Two exposed walls meeting directly must retain both distinct directions.
// A genuine chamfer retains its central representative.
const directCorner=[[0,0],[20,0],[30,20],[0,20]];
const directSelected=selectLogoWalls(directCorner,[],[],new Set([2,3]));
assert.deepEqual(directSelected,[0,1],
 'Direct junction keeps both usable directions');
const broadChamfer=[[0,0],[20,0],[25,5],[25,15],[0,15]];
const chamferSelected=selectLogoWalls(broadChamfer);
assert.ok(chamferSelected.includes(1)&&!chamferSelected.includes(0)&&!chamferSelected.includes(2),
 'Gradual corner retains its central representative');

const distantParallel=[[0,0],[10,0],[10,10],[20,10],
 [20,0],[30,0],[30,20],[0,20]];
assert.deepEqual(selectLogoWalls(distantParallel,[[[-10,-6],[40,-6]]],[]),[0,5,6,7],
 'Separated parallel frontages merge regardless of distance; other directions remain');

// A tiny 45-degree chamfer at a TRUE right-angle corner is not a bridge.
const chamfer=[[0,0],[19.5,0],[20,.5],[20,20],[0,20]];
assert.deepEqual(selectLogoWalls(chamfer,[[[0,-8],[20,-8]],[[28,0],[28,20]]],[]).sort((a,b)=>a-b),[0,2,3,4],
 'Perpendicular street frontages remain separate despite a tiny corner chamfer');

// Torikizoku style: two separate sharp street faces, each retaining a logo.
const twoRoads=[[[0,-8],[20,-8]],[[28,0],[28,20]]];
assert.deepEqual(selectLogoWalls(square,twoRoads,[]).sort((a,b)=>a-b),[0,1,2,3],
 'Two perpendicular road fronts remain independent facade groups');
assert.deepEqual(selectLogoWalls(square,twoRoads,[eastNeighbor],blocked),[0,2,3],
 'A neighboring building still excludes its blocked road-facing frontage');

const boxed=[
 [[.2,-2],[20,-2],[20,-.2],[.2,-.2]],
 [[20.2,0],[23,0],[23,20],[20.2,20]],
 [[.2,20.2],[20,20.2],[20,24],[.2,24]],
 [[-4,0],[-.2,0],[-.2,20],[-4,20]]
];
assert.deepEqual([...blockedBuildingWalls(square,boxed)].sort((a,b)=>a-b),[0,1,2,3],
 'All four facades are occluded by close buildings');
assert.equal(selectEntranceWall(square,[],boxed,4),-1,
 'No door may be restored on physically blocked walls');
assert.equal(selectEntranceWall(square,[[[22,2],[22,18]]],[eastNeighbor],4),3,
 'A neighboring building blocks east wall; without other road, choose center of remaining run');
// Faces which are too short cannot host a door, even if a road is nearby.
const uneven=[[0,0],[2,0],[20,0],[20,20],[0,20]];
assert.equal(selectEntranceWall(uneven,[],[],4),2,
 'Short first and last edges excluded, leaving a three-edge run with center');
// A wall wider than the door remains eligible after exclusion.
const narrow=[[0,0],[3,0],[3,3],[0,3]];
assert.equal(selectEntranceWall(narrow,[],[],4),-1,
 'All faces too short: no impossible door geometry');
// Glazing and UV signs must honor the identical blocked set while leaving
// the original building-color polygon in place.
const {paintConvenienceWall}=await import('../komorebi3d/objects/buildings/convenience/osm-adapter.js');
const blank=[],blockedPaint=[];
const fakeBrand={id:'sample',sign:{background:0x123456,upper:0x123456,lower:0x123456}};
const wall=(out,obstructed)=>paintConvenienceWall((mesh,...args)=>out.push(args),{},
 square[1],square[2],3,0x8899aa,[{bottom:0,top:3,brand:fakeBrand}],
 'side',1,obstructed);
wall(blank,false);wall(blockedPaint,true);
assert.ok(blank.length>1,'Accessible walls still draw storefront glass and signage');
assert.equal(blockedPaint.length,1,'Blocked first-floor glass and fascia become one plain wall');
assert.equal(blockedPaint[0].at(-1),0x8899aa,'Blocked storefront uses the building wall color');
const upstairsStore=[];
paintConvenienceWall((mesh,...args)=>upstairsStore.push(args),{},
 square[1],square[2],6,0x8899aa,
 [{bottom:0,top:3,brand:fakeBrand},{bottom:3,top:6,brand:fakeBrand}],
 'side',1,true);
assert.ok(upstairsStore.length>1,'Second-floor conventional sign remains on blocked side');
assert.ok(upstairsStore.some(q=>q.at(-1)===0x123456),'Upper brand color remains');
assert.ok(!upstairsStore.some(q=>q.at(-1)===0xbcd3dd&&q.slice(0,4).some(v=>v[1]<3-1e-8)),
 'No blocked first-floor glass; second-floor windows remain unchanged');
const full=[],occluded=[],all=[];
const paint=(out,mask)=>paintImageFacade((mesh,...args)=>out.push(args),{},
 square,{bottom:0,top:3,texture:'test',backgroundColor:0xffcc00,
 texturedFaces:[],groundGlassTop:3,entranceEdgeIndex:3,blockedWalls:mask});
assert.equal(paint(full,new Set()),true);
assert.equal(paint(occluded,blocked),true);
assert.ok(full.length>occluded.length,'Occluded image facades omit glass and ground fascia');
assert.equal(paint(all,new Set([0,1,2,3])),true,'Fully occluded ground-floor facade is still a valid store');
assert.equal(all.length,0,'All blocked ground-floor walls stay the original building color');
const upperPaint=[],upperFaces=[];
assert.equal(paintImageFacade((mesh,...args)=>upperPaint.push(args),{},square,{
 bottom:0,top:6,texture:'test',backgroundColor:0xffcc00,
 texturedFaces:upperFaces,groundGlassTop:3,entranceEdgeIndex:3,blockedWalls:blocked}),true);
assert.equal(upperFaces[0].backgroundColor,0xffcc00);
const sideUpper=[];
for(let i=0;i<upperFaces[0].backgroundPositions.length;i+=18){
 const p=upperFaces[0].backgroundPositions.slice(i,i+18);
 if(p.every((v,j)=>j%3!==0||Math.abs(v-20)<.2))sideUpper.push(p);
}
assert.ok(sideUpper.length>0,'Blocked east wall retains upper-floor brand color');
assert.ok(sideUpper.every(p=>p.every((v,i)=>i%3!==1||v>=3-1e-8)),
 'Brand-colored wall on blocked wall begins at second floor');
assert.ok(upperFaces[0].positions.length>0,'Upper image UV surfaces remain generated');
const upstairs=[],upstairsFaces=[];
assert.equal(paintImageFacade((mesh,...args)=>upstairs.push(args),{},square,{bottom:3,top:6,
 texture:'test',backgroundColor:0xffcc00,texturedFaces:upstairsFaces,blockedWalls:blocked}),true);
assert.equal(upstairs.length,0,'No overlapping Engine background wall');
assert.equal(upstairsFaces[0].backgroundPositions.length,13*18,'Three inlaid walls and one solid wall');
assert.equal(upstairsFaces[0].uvs.filter((v,i)=>v===1&&i%12===0).length,3,
 'Second floor excludes neighboring building side from its logo faces');
const roadQuads=[],roadFaces=[];
paintImageFacade((mesh,...args)=>roadQuads.push(args),{},square,{bottom:3,top:6,
 texture:'test',backgroundColor:0xffcc00,texturedFaces:roadFaces,
 blockedWalls:blocked,logoWallIndices:selectLogoWalls(square,westRoad,[eastNeighbor],blocked)});
const fullUV=new Set(['1,0,0,0,0,1,1,0,0,1,1,1','0,0,1,0,1,1,0,0,1,1,0,1']);
const logos=[];
for(let i=0;i<roadFaces[0].uvs.length;i+=12){
 if(!fullUV.has(roadFaces[0].uvs.slice(i,i+12).join(',')))continue;
 const p=roadFaces[0].positions.slice(i/12*18,i/12*18+18);
 logos.push({x:p[0],z:p[2]});
}
assert.equal(logos.length,3,'Each exposed direction receives a logo');
assert.ok(logos.some(logo=>Math.abs(logo.x)<.02),'West road face retains its logo');
assert.equal(roadQuads.filter(q=>q.at(-1)===0xffcc00).length,0);
assert.equal(roadFaces[0].backgroundPositions.length,13*18,
 'Branded solid wall remains on every facade, including the blocked side');

const multiFaces=[];
assert.equal(paintImageFacade(()=>{}, {},hexagon,{
 bottom:3,top:6,texture:'test',backgroundColor:0xffcc00,texturedFaces:multiFaces
}),true);
const logoCount=multiFaces[0].uvs.filter((v,i)=>
 i%12===0&&v===1).length;
assert.equal(logoCount,1,
 'The renderer uses the same single continuous frontage as the selector');
console.log('Shared neighbor-occlusion: ground glass + fascia blocked; upper branding remains PASS');

// A visible middle face between equally preferred ends must not split an entrance run.
const cornerOutline=[[0,0],[10,0],[15,5],[15,15],[0,15]];
const cornerAssessment=[{i:0,len:10,road:{priority:1},roadEligible:true,normal:[0,-1]},{i:1,len:7,road:{priority:0},roadEligible:true,normal:[.707,-.707]},{i:2,len:10,road:{priority:1},roadEligible:true,normal:[1,0]}];
assert.equal(selectEntranceWall(cornerOutline,[],[],4,null,cornerAssessment),1,'Visible middle entrance joins equally preferred frontage ends');
assert.equal(facadeRoadRank(cornerAssessment[0]),2);
