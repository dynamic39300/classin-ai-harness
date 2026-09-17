// The launcher owns the model bridge. IPC loss must also stop its detached
// runtime group; otherwise the HTTP host stays healthy with a dead model route.
import { spawn, spawnSync } from 'node:child_process';

if (!process.connected || process.argv.length < 3) process.exit(1);
const child = spawn(process.argv[2], process.argv.slice(3), { stdio: 'inherit' });
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (process.platform === 'win32') {
    if (child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    process.exit(1);
  }
  // This wrapper is the detached group leader. Only its own descendants are hit.
  try { process.kill(-process.pid, 'SIGTERM'); } catch { process.exit(1); }
  setTimeout(() => { process.kill(-process.pid, 'SIGKILL'); }, 750);
}
process.on('disconnect', stop);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.once('error', stop);
child.once('exit', (code, signal) => {
  if (stopping) return;
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
  process.removeListener('disconnect', stop);
  if (process.connected) process.disconnect();
});
// Covers a parent exit between initial IPC validation and listener attachment.
if (!process.connected) stop();
