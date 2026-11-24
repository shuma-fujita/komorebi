import assert from 'node:assert/strict';
import {chooseFacadeCornerColor as choose} from '../komorebi3d/maps/map-facade-textures.js';
const black=[0,0,0,255],white=[255,255,255,255],orange=[255,109,0,255],clear=[0,0,0,0];
assert.equal(choose([black,black,black,white],0xffffff),0);
assert.equal(choose([orange,orange,orange,orange],0),0xff6d00);
assert.equal(choose([black,black,white,white],0x123456),0x123456);
assert.equal(choose([clear,clear,clear,white],0x123456),0x123456);
assert.equal(choose([black,black,black,clear],0xffffff),0);
console.log('Facade corner color PASS');
