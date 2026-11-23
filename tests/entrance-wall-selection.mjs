#!/usr/bin/env node
import assert from 'node:assert/strict';
import {middleEntranceEdge,selectEntranceWall,blockedBuildingWalls,eligibleFacadeWalls,selectLogoWalls} from '../komorebi3d/maps/entrance-wall-selection.js';
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
assert.deepEqual(selectLogoWalls(square,westRoad,[eastNeighbor],blocked),[3],
 'Upper-only logos prefer unblocked road-facing facade');
assert.deepEqual(selectLogoWalls(square,[],[eastNeighbor],blocked),[0,2,3],
 'Missing road information falls back to accessible facade walls');
assert.equal(selectEntranceWall(square,westRoad,[eastNeighbor],4,blocked),3,
 'The unchanged door chooser uses the same road/obstruction candidates');
assert.equal(selectEntranceWall(square,[[[-10,3],[-10,17]]],[eastNeighbor],4,blocked),3,
 'Road with opposite direction still selects the same door face');

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
const {paintImageFacade}=await import('../komorebi3d/objects/buildings/brand-facade.js');
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
assert.ok(upperPaint.some(q=>q.at(-1)===0xffcc00),
 'Brand color remains on upper floors above a blocked first floor');
const sideUpper=upperPaint.filter(q=>q.at(-1)===0xffcc00&&
 q.slice(0,4).every(v=>Array.isArray(v)&&Math.abs(v[0]-20)<.2));
assert.ok(sideUpper.length>0,'Blocked east wall retains upper-floor brand color');
assert.ok(sideUpper.every(q=>q.slice(0,4).every(v=>v[1]>=3-1e-8)),
 'Brand-colored overlay on blocked wall begins at second floor');
assert.ok(upperFaces[0].positions.length>0,'Upper image UV surfaces remain generated');
const upstairs=[],upstairsFaces=[];
assert.equal(paintImageFacade((mesh,...args)=>upstairs.push(args),{},square,{bottom:3,top:6,
 texture:'test',backgroundColor:0xffcc00,texturedFaces:upstairsFaces,blockedWalls:blocked}),true);
assert.equal(upstairs.length,4,'Second floor brand color wraps all four walls');
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
assert.equal(logos.length,1,'Only visible road-facing facade receives a logo');
assert.ok(Math.abs(logos[0].x)<.02,'Logo is on the previously unused west road face');
assert.equal(roadQuads.filter(q=>q.at(-1)===0xffcc00).length,4,
 'Branded wall color remains on every facade, including the blocked side');

console.log('Shared neighbor-occlusion: ground glass + fascia blocked; upper branding remains PASS');
