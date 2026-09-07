import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
let stopping = false;
function start(args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
  children.add(child);
  child.once('exit', () => children.delete(child));
  child.once('error', (error) => process.stderr.write(`Unable to start service: ${error.message}\n`));
  return child;
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
const harness = start(['scripts/start-harness.mjs']);
harness.once('exit', (code) => {
  if (!stopping && code !== 0) process.stderr.write('TeachBuddy runtime stopped. Review the runtime log and restart npm run dev.\n');
});
const vite = start(['node_modules/vite/bin/vite.js', ...process.argv.slice(2)]);
vite.once('exit', (code) => stop(code ?? 1));
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
