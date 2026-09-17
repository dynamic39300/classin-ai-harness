import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import test from 'node:test';

test('launcher reads .env privately, pins the package and passes isolated paths', async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'teachbuddy-launch-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const scripts = join(root, 'scripts');
  const bin = join(root, 'bin');
  const originalHome = join(root, 'original-home');
  await mkdir(scripts);
  await mkdir(join(root, 'runtime/harness'), { recursive: true });
  await copyFile(new URL('./gateway-compat.mjs', import.meta.url), join(root, 'runtime/harness/gateway-compat.mjs'));
  await mkdir(bin);
  await mkdir(originalHome);
  await writeFile(join(originalHome, '.env'), 'DEEPSEEK_API_KEY=fixture-user-key\nUNRELATED_USER_VALUE=not-forwarded\n');
  await copyFile(new URL('../../scripts/start-harness.mjs', import.meta.url), join(scripts, 'start-harness.mjs'));
  await copyFile(new URL('../../scripts/harness-process.mjs', import.meta.url), join(scripts, 'harness-process.mjs'));
  await writeFile(join(root, '.env'), 'DEEPSEEK_API_KEY=fixture-secret\nTEACHBUDDY_LAUNCH_FIXTURE=file\nDSH_HOME=/wrong\n');
  await writeFile(join(bin, 'npx'), `#!/usr/bin/env node
console.log(JSON.stringify({
  args: process.argv.slice(2), cwd: process.cwd(), home: process.env.DSH_HOME,
  configured: process.env.DEEPSEEK_API_KEY === 'fixture-secret',
  userConfigured: process.env.DEEPSEEK_API_KEY === 'fixture-user-key',
  unrelatedUserValue: process.env.UNRELATED_USER_VALUE !== undefined,
  precedence: process.env.TEACHBUDDY_LAUNCH_FIXTURE,
  configRoot: process.env.TEACHBUDDY_HARNESS_CONFIG_ROOT,
  mode: process.env.DSH_TOOLS_MODE, permission: process.env.DSH_PERMISSION_MODE,
  node: process.versions.node,
}));
`, { mode: 0o700 });
  const env = { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`, DSH_HOME: originalHome, TEACHBUDDY_LAUNCH_FIXTURE: 'inherited' };
  delete env.DEEPSEEK_API_KEY;
  delete env.UNRELATED_USER_VALUE;
  async function invoke() {
    const child = spawn(process.execPath, [join(scripts, 'start-harness.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let diagnostics = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { diagnostics += data; });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    assert.equal(code, 0, diagnostics);
    assert.equal(diagnostics, '');
    assert.equal(output.includes('fixture-secret'), false);
    assert.equal(output.includes('fixture-user-key'), false);
    return JSON.parse(output);
  }
  const observed = await invoke();
  assert.deepEqual(observed.args, ['--yes', 'pnpm@11.7.0', 'dlx', ...['@deepseek-ai/dsh-subprocess-local', '@google/genai', 'koffi', 'node-pty', 'protobufjs'].map(name => `--allow-build=${name}`), '@deepseek-ai/dsh@0.1.1-rc.2',
    'web', '--patch', join(root, 'runtime/harness/cordis.patch.yml'), '--no-open', '--port', '3080']);
  assert.equal(observed.cwd, join(root, '.runtime/workspace'));
  assert.equal(observed.home, join(root, '.runtime/harness-home'));
  assert.equal(observed.configRoot, join(root, 'runtime/harness'));
  assert.equal(observed.configured, true);
  assert.equal(observed.precedence, 'inherited');
  assert.equal(observed.mode, 'native');
  assert.equal(observed.permission, 'read-only');
  const [major, minor] = observed.node.split('.').map(Number);
  assert.ok(major >= 24 || (major === 22 && minor >= 19));
  await rm(join(root, '.env'));
  const fallback = await invoke();
  assert.equal(fallback.userConfigured, true);
  assert.equal(fallback.unrelatedUserValue, false);
  assert.equal(fallback.home, join(root, '.runtime/harness-home'));
  env.DEEPSEEK_API_KEY = 'fixture-secret';
  const inherited = await invoke();
  assert.equal(inherited.configured, true);
  assert.equal(inherited.userConfigured, false);
});

test('loss of the bridge-owning launcher also stops the runtime process tree', { skip: process.platform === 'win32' }, async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'teachbuddy-orphan-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'runtime/harness'), { recursive: true });
  await mkdir(join(root, 'bin'));
  await copyFile(new URL('../../scripts/start-harness.mjs', import.meta.url), join(root, 'scripts/start-harness.mjs'));
  await copyFile(new URL('./gateway-compat.mjs', import.meta.url), join(root, 'runtime/harness/gateway-compat.mjs'));
  await copyFile(new URL('../../scripts/harness-process.mjs', import.meta.url), join(root, 'scripts/harness-process.mjs'));
  await writeFile(join(root, '.env'), 'DEEPSEEK_API_KEY=fixture-key\nDEEPSEEK_BASE_URL=http://127.0.0.1:1/v1\n');
  await writeFile(join(root, 'bin/npx'), `#!/usr/bin/env node
require('node:child_process').spawn(process.execPath,['-e',
  "const server=require('node:http').createServer((req,res)=>res.end('ready'));server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({pid:process.pid,port:server.address().port})));"
],{stdio:'inherit'});
`, { mode: 0o700 });
  const child = spawn(process.execPath, [join(root, 'scripts/start-harness.mjs')], {
    env: { ...process.env, PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH ?? ''}` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let fixture;
  t.after(() => { child.kill('SIGKILL'); if (fixture) { try { process.kill(fixture.pid, 'SIGKILL'); } catch { /* Already stopped. */ } } });
  fixture = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Fixture failed to start')), 5000);
    child.stdout.on('data', data => { output += data; if (output.includes('\n')) { clearTimeout(timer); resolve(JSON.parse(output.split('\n')[0])); } });
    child.once('error', reject);
  });
  const url = `http://127.0.0.1:${fixture.port}`;
  assert.equal((await fetch(url)).status, 200);
  child.kill('SIGKILL');
  let reachable = true;
  for (let attempt = 0; attempt < 30 && reachable; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    try { await fetch(url, { signal: AbortSignal.timeout(200) }); } catch { reachable = false; }
  }
  assert.equal(reachable, false, 'Runtime must not remain healthy after its model bridge has died');
});
