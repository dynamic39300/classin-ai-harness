import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const root=new URL('..',import.meta.url).pathname;
async function check(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await check(p);else if(/\.(mjs|js)$/.test(e.name))execFileSync(process.execPath,['--check',p],{stdio:'inherit'});}}
await check(root);console.log('JavaScript syntax checks passed.');
