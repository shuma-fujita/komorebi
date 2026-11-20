import assert from 'node:assert/strict';
import {keyboardSheetHeight} from '../komorebi3d/maps/editor-keyboard-layout.js';

// The A/B preview keeps 40% of the original 600px game height (240px).
assert.equal(keyboardSheetHeight(800,240),360,'normal: 40/60');
assert.equal(keyboardSheetHeight(500,240),260,'keyboard: remaining space');
assert.equal(keyboardSheetHeight(350,240),110,'keyboard: narrow tag strip');
assert.equal(keyboardSheetHeight(200,240),0,'keyboard: no negative height');
assert.equal(keyboardSheetHeight(600,240),360,'no keyboard: normal 60% sheet');
console.log('editor keyboard sheet height: PASS');
