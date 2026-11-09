// @ts-nocheck -- Node test environment typings are not part of Svelte's jsconfig.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/lib/components/MagnetArticle.svelte', import.meta.url),'utf8');
const admin = readFileSync(new URL('../src/routes/admin/news/magnet/+page.svelte', import.meta.url),'utf8');
const publicPage = readFileSync(new URL('../src/routes/news/magnet/[slug]/+page.svelte', import.meta.url),'utf8');

test('share card keeps 4:5 output and allocates room for all six impact strips',()=>{
  assert.match(component,/\.sharecard\s*\{[^}]*width:540px;height:675px/u);
  assert.match(component,/\.sharecard \.hero\s*\{[^}]*flex:0 0 204px/u);
  assert.match(component,/\.sharecard \.strips\s*\{[^}]*grid-template-rows:repeat\(6,minmax\(0,1fr\)\)/u);
  assert.match(component,/\.sharecard footer\s*\{[^}]*flex:0 0 auto/u);
});

test('export is 1080x1350 and does not silently export incomplete articles',()=>{
  assert.match(admin,/pixelRatio:2/u);
  assert.match(publicPage,/pixelRatio:2/u);
  assert.match(admin,/if\(issues\.length\) throw new Error/u);
});

test('native WhatsApp share passes news text alongside image when supported',()=>{
  assert.match(admin,/files:\[f\],title:draft\.headline,text:magnetShareText/u);
  assert.match(publicPage,/files:\[f\],title:article\.headline,text/u);
});
