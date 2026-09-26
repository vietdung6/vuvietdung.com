import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
for(const file of readdirSync('js').filter(f=>f.endsWith('.js'))){
 const path='js/'+file;execFileSync(process.execPath,['--check',path]);
 const text=readFileSync(path,'utf8');
 for(const m of text.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g))assert.ok(existsSync(resolve(dirname(path),m[1])),`${path}: missing ${m[1]}`);
}
const html=readFileSync('index.html','utf8');
assert.ok(html.includes('href="/oxytocin/"'),'story route missing');
for(const match of html.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"?]+)/g))assert.ok(existsSync(match[1]),`missing ${match[1]}`);
console.log('JavaScript syntax, module imports and site entry assets: OK');
