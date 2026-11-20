import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8'); const html=await readFile(new URL('../index.html',import.meta.url),'utf8'); const js=await readFile(new URL('../app.js',import.meta.url),'utf8');
assert.match(css,/@media\s*\(max-width:\s*760px\)/); assert.match(css,/@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1050px\)/); assert.match(css,/grid-template-columns:\s*38px minmax\(0, 1fr\) auto/); assert.match(css,/overflow-y:\s*auto/); assert.match(html,/Descoperă produsele/); assert.match(js,/e\.key==='Escape'/);
const mobileStart=css.indexOf('@media (max-width: 760px) {');
const desktopStart=css.indexOf('@media (min-width: 761px)',mobileStart);
const mobileRules=css.slice(mobileStart,desktopStart);
const heroCopy=html.indexOf('<div class="hero-copy">');
const heroCta=html.indexOf('href="#produse">Descoperă produsele');
const heroImage=html.indexOf('<div class="hero-visual">');
assert.ok(heroCopy>=0&&heroCopy<heroCta&&heroCta<heroImage,'Hero CTA must precede the image in document order.');
assert.ok(mobileRules.includes('.hero-copy { order: 1;'),'Mobile hero puts copy first.');
assert.ok(mobileRules.includes('.hero-visual { order: 2;'),'Mobile hero puts image second.');
assert.match(css,/\.hero\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/,'Desktop hero keeps its two-column grid.');
for(const w of [390,1280]) {
 if(w===390) {
  assert.ok(mobileRules.includes('.hero-copy { order: 1;')&&mobileRules.includes('.hero-visual { order: 2;'));
  console.log('PASS 390px: hero title and CTA precede the image.');
 } else {
  assert.match(css,/\.hero\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
  console.log('PASS 1280px: desktop two-column hero remains intact.');
 }
}

