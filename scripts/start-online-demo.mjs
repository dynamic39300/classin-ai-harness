import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const parsedPort = Number.parseInt(process.env.PORT ?? '4173', 10);

if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  process.stderr.write('PORT must be an integer between 1 and 65535.\n');
  process.exit(1);
}

const children = new Set();
let stopping = false;

function start(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  children.add(child);
  child.once('error', (error) => {
    process.stderr.write(`[online-demo] Unable to start ${label}: ${error.message}\n`);
    stop(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (stopping) return;
    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
    process.stderr.write(`[online-demo] ${label} stopped with ${reason}.\n`);
    stop(code ?? 1);
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}

start('TeachBuddy Harness', ['scripts/start-harness.mjs']);
start('Web server', [
  'node_modules/vite/bin/vite.js',
  'preview',
  '--host',
  '0.0.0.0',
  '--port',
  String(parsedPort),
  '--strictPort',
]);

process.once('SIGINT', () => stop(130));
process.once('SIGTERM', () => stop(143));
