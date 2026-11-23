#!/usr/bin/env node
import assert from 'node:assert/strict';
import {middleEntranceEdge,selectEntranceWall,blockedBuildingWalls} from '../komorebi3d/maps/entrance-wall-selection.js';
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
assert.equal(blockedPaint.length,1,'Obstructed convenience wall is plain building color');
assert.equal(blockedPaint[0].at(-1),0x8899aa);
const full=[],occluded=[],all=[];
const paint=(out,mask)=>paintImageFacade((mesh,...args)=>out.push(args),{},
 square,{bottom:0,top:3,texture:'test',backgroundColor:0xffcc00,
 texturedFaces:[],groundGlassTop:3,entranceEdgeIndex:3,blockedWalls:mask});
assert.equal(paint(full,new Set()),true);
assert.equal(paint(occluded,blocked),true);
assert.ok(full.length>occluded.length,'Occluded image facades do not render glass or color overlays');
assert.equal(paint(all,new Set([0,1,2,3])),false,'Fully occluded logo storefront stays plain');
assert.equal(all.length,0,'No overlays for fully blocked storefronts');
console.log('Shared neighbor-occlusion: entrance, conventional glass, image glass, and wall-color fallback PASS');
