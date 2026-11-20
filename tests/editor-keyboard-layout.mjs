import assert from 'node:assert/strict';
import {keyboardSheetHeight} from '../komorebi3d/maps/editor-keyboard-layout.js';

// The A/B preview keeps half the original game height (300px).
assert.equal(keyboardSheetHeight(800,300),300,'normal: 50/50');
assert.equal(keyboardSheetHeight(500,300),200,'keyboard: remaining space');
assert.equal(keyboardSheetHeight(350,300),50,'keyboard: narrow tag strip');
assert.equal(keyboardSheetHeight(280,300),0,'keyboard: no negative height');
assert.equal(keyboardSheetHeight(600,300),300,'no keyboard: exactly half');
console.log('editor keyboard sheet height: PASS');
