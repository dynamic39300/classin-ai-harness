import type { ClassInDocumentText } from '../src/contracts/classin-test/index.ts';
export async function readPdfText(bytes: Uint8Array): Promise<ClassInDocumentText> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: Uint8Array.from(bytes), useSystemFonts: false, disableFontFace: true, verbosity: 0 });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 25) throw new Error('Page limit');
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index); const content = await page.getTextContent();
      pages.push(content.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''));
      page.cleanup();
      if (pages.reduce((length, text) => length + text.length, 0) > 60000) throw new Error('Text limit');
    }
    const text = pages.join('\n').trim();
    return text ? { status: 'available', text, pages: pdf.numPages, message: '来自实际PDF文字层；数学版式请对照原PDF。' }
      : { status: 'unavailable', text: '', pages: pdf.numPages, message: 'PDF未提供可读取文字层，尚未进行图片识别。' };
  } catch { return { status: 'unavailable', text: '', pages: null, message: 'PDF文字暂不可读或超出25页/60000字符上限；请打开原资料核对。' }; }
  finally { await task.destroy(); }
}
