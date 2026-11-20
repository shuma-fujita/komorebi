import assert from 'node:assert/strict';
import {keyboardSheetHeight} from '../komorebi3d/maps/editor-keyboard-layout.js';

// 600px game: preview=180px (30%) and tag editor=420px (70%).
assert.equal(keyboardSheetHeight(800,180,420),420,'normal: 30/70');
assert.equal(keyboardSheetHeight(500,180,420),320,'keyboard: remaining space');
assert.equal(keyboardSheetHeight(350,180,420),170,'keyboard: narrow tag area');
assert.equal(keyboardSheetHeight(150,180,420),0,'keyboard: no negative height');
assert.equal(keyboardSheetHeight(600,180,420),420,'no keyboard: normal 70% sheet');
console.log('editor keyboard sheet height: PASS');
