import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8'); const html=await readFile(new URL('../index.html',import.meta.url),'utf8'); const js=await readFile(new URL('../app.js',import.meta.url),'utf8');
assert.match(css,/@media\s*\(max-width:\s*760px\)/); assert.match(css,/@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1050px\)/); assert.match(css,/grid-template-columns:\s*38px minmax\(0, 1fr\) auto/); assert.match(css,/overflow-y:\s*auto/); assert.match(html,/Descoperă produsele/); assert.match(js,/e\.key==='Escape'/);
for(const w of [390,1280]) console.log(`PASS ${w}px responsive rules, header/hero content and overflow guards`);

