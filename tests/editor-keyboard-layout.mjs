import assert from 'node:assert/strict';
import {keyboardSheetHeight} from '../komorebi3d/maps/editor-keyboard-layout.js';
import {BUILDING_PREVIEW_RATIO,BUILDING_SHEET_RATIO} from '../komorebi3d/maps/building-editor-layout.js';

const total=600;
const preview=total*BUILDING_PREVIEW_RATIO;
const sheet=total*BUILDING_SHEET_RATIO;
assert.equal(keyboardSheetHeight(800,preview,sheet),sheet,'normal: shared ratio');
assert.equal(keyboardSheetHeight(500,preview,sheet),Math.min(sheet,500-preview),'keyboard: remaining space');
assert.equal(keyboardSheetHeight(350,preview,sheet),Math.max(0,350-preview),'keyboard: narrow tag area');
assert.equal(keyboardSheetHeight(100,preview,sheet),0,'keyboard: no negative height');
assert.equal(keyboardSheetHeight(total,preview,sheet),sheet,'no keyboard: normal sheet');
console.log('editor keyboard sheet height: PASS');
