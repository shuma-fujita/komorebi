#!/usr/bin/env node
import assert from 'node:assert/strict';
import {middleEntranceEdge,selectEntranceWall} from '../komorebi3d/maps/entrance-wall-selection.js';
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
console.log('Entrance wall filtering, cyclic central face, and deterministic tie-breaking PASS');
