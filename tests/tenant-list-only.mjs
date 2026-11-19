#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const labels=read('komorebi3d/maps/map-labels.js');
const controls=read('komorebi3d/dev-panel-components.js');
const template=read('komorebi3d/dev.template.html');
const dev=read('komorebi3d/dev.html');
const mock=read('komorebi3d/mock.html');
for(const [file,source] of Object.entries({labels,controls,template,dev,mock})){
 assert.doesNotMatch(source,/setShopMode|shopModes|shopLayout|shop-mode-settings|data-shop-mode|焦点ビル内の店舗表示/,file+' retains shop comparison');
}
assert.match(labels,/入居施設 /);
assert.match(labels,/outsideFootprint/);
assert.match(labels,/⚠ 建物外（外周1m以内・位置要確認）/);
assert.match(labels,/syncShopPane\(el\)/);
assert.match(labels,/scrollTop=0/);
assert.match(labels,/openEditor\(row\._osmItem\)/);
assert.match(dev,/id="mode-compare"/,'game A/B engine comparison should remain');
assert.match(mock,/id="mode-compare"/,'mock A/B engine comparison should remain');
assert.match(template,/map-labels\.js\?v=tenant-list-only-20261119/);
assert.match(dev,/map-labels\.js\?v=tenant-list-only-20261119/);
console.log('Single tenant list regression: 15 assertions PASS');
