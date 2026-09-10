import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { lstat, mkdir } from 'node:fs/promises';
import { delimiter, dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRoot = join(projectRoot, '.runtime');
const configRoot = join(projectRoot, 'runtime/harness');
const runtimeVersion = '0.1.1-rc.2';

function supportedNode(version) {
  const [major, minor] = version.trim().split('.').map(Number);
  return major >= 24 || (major === 22 && minor >= 19);
}

function launch(command, args, options) {
  const processGroup = process.platform !== 'win32';
  const child = spawn(command, args, { ...options, stdio: 'inherit', detached: processGroup });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    try {
      if (processGroup && child.pid) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  });
  child.on('error', () => {
    console.error('[teachbuddy-harness] Could not launch the pinned runtime process.');
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
  });
}

async function start() {
  if (!supportedNode(process.versions.node)) {
    const candidates = [
      process.env.TEACHBUDDY_NODE,
      join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'),
      '/opt/homebrew/bin/node',
      '/usr/local/bin/node',
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        const version = execFileSync(candidate, ['-p', 'process.versions.node'], {
          encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000,
        });
        if (!supportedNode(version)) continue;
        launch(candidate, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
          env: { ...process.env, PATH: `${dirname(candidate)}${delimiter}${process.env.PATH ?? ''}` },
        });
        return;
      } catch {
        // Try another installed runtime without installing packages or changing PATH globally.
      }
    }
    throw new Error('DeepSeek Harness rc2 requires Node 22.19+ (22.x) or Node 24+. Set TEACHBUDDY_NODE to a supported executable.');
  }
  let fileEnvironment = {};
  try {
    fileEnvironment = parseEnv(readFileSync(join(projectRoot, '.env'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Could not load the project .env file.', { cause: error });
  }
  const originalHome = process.env.DSH_HOME?.trim() ? process.env.DSH_HOME : join(homedir(), '.dsh');
  const expandedHome = originalHome === '~' ? homedir()
    : originalHome.startsWith('~/') || originalHome.startsWith('~\\') ? join(homedir(), originalHome.slice(2))
      : originalHome;
  let userKey;
  if (process.env.DEEPSEEK_API_KEY === undefined && fileEnvironment.DEEPSEEK_API_KEY === undefined) {
    try {
      userKey = parseEnv(readFileSync(join(resolve(expandedHome), '.env'), 'utf8')).DEEPSEEK_API_KEY;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Could not load the original Harness user .env file.', { cause: error });
    }
  }
  const env = {
    ...(userKey === undefined ? {} : { DEEPSEEK_API_KEY: userKey }),
    ...fileEnvironment,
    ...process.env,
    PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
    DSH_HOME: join(runtimeRoot, 'harness-home'),
    DSH_CWD: join(runtimeRoot, 'workspace'),
    DSH_TELEMETRY_DISABLED: '1',
    DSH_PERMISSION_MODE: 'read-only',
    DSH_TOOLS_MODE: 'native',
    TEACHBUDDY_HARNESS_CONFIG_ROOT: configRoot,
  };
  for (const path of [runtimeRoot, env.DSH_HOME, env.DSH_CWD]) {
    await mkdir(path, { recursive: true, mode: 0o700 });
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error('Runtime directories must be real directories, not symbolic links.');
    }
  }
  const extra = process.argv.slice(2);
  if (extra.some(arg => arg !== '--dump-config')) {
    throw new Error('Only --dump-config is accepted; the runtime host, port, patch, and paths are fixed.');
  }
  const allowedBuilds = ['@deepseek-ai/dsh-subprocess-local', '@google/genai', 'koffi', 'node-pty', 'protobufjs'];
  const args = ['--yes', 'pnpm@11.7.0', 'dlx', ...allowedBuilds.map(name => `--allow-build=${name}`), `@deepseek-ai/dsh@${runtimeVersion}`, 'web', '--patch', join(configRoot, 'cordis.patch.yml')];
  args.push(...(extra.length ? ['--dump-config'] : ['--no-open', '--port', '3080']));
  launch('npx', args, { cwd: env.DSH_CWD, env });
}

start().catch(error => {
  console.error(`[teachbuddy-harness] ${error.message}`);
  process.exitCode = 1;
});
