import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('ClassIn image OCR boundary', () => {
  it('rejects empty images before invoking platform OCR', async () => await expect(import('./classin-image-ocr').then(({ readImageText }) => readImageText(new Uint8Array()))).rejects.toThrow('大小超出'));
  it('keeps the Swift source available for the governed local adapter', async () => expect((await readFile('server/classin-image-ocr.swift', 'utf8'))).toContain('VNRecognizeTextRequest'));
});
