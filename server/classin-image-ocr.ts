import { execFile } from 'node:child_process';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ClassInError } from './classin-test-transport.ts';

const run = promisify(execFile);
const source = join(process.cwd(), 'server', 'classin-image-ocr.swift');
const binary = join(process.cwd(), '.runtime', 'private', 'classin-test', 'bin', 'classin-image-ocr');
let compiling: Promise<void> | undefined;
async function ensureBinary() {
  if (!compiling) compiling = (async () => {
    const [sourceInfo, binaryInfo] = await Promise.all([stat(source), stat(binary).catch(() => null)]);
    if (binaryInfo && binaryInfo.mtimeMs >= sourceInfo.mtimeMs) return;
    await mkdir(dirname(binary), { recursive: true });
    await run('swiftc', [source, '-o', binary], { timeout: 60_000, maxBuffer: 2_000_000 });
  })().finally(() => { compiling = undefined; });
  await compiling;
}

export async function readImageText(bytes: Uint8Array, extension = '.png') {
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new ClassInError('unsupported', '题图大小超出OCR读取边界。');
  await ensureBinary(); const path = join(process.cwd(), '.runtime', 'private', 'classin-test', `ocr-${randomUUID()}${extension}`);
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes);
  try {
    const { stdout } = await run(binary, [path], { timeout: 30_000, maxBuffer: 2_000_000 });
    const text = stdout.replace(/\r/g, '').trim();
    if (text.length < 10) throw new ClassInError('incomplete', '题图OCR未取得足够文字，不能生成讲解。');
    return text;
  } catch (error) {
    if (error instanceof ClassInError) throw error;
    throw new ClassInError('unsupported', '当前设备未能完成题图OCR，不能猜测题面。');
  } finally { await unlink(path).catch(() => {}); }
}
