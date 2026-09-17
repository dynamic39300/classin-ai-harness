// @vitest-environment node
import { expect, it } from 'vitest';
import { readPdfText } from './classin-pdf-text';
function pdfFixture(pages: number) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(' ')}] >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  for (let i = 0; i < pages; i++) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    const content = 'BT /F1 12 Tf 50 780 Td (Rational numbers: -2 + 3 = 1) Tj ET';
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(output.length); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = output.length;
  output += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}
it('extracts actual PDF text without relying on a source-content manifest', async () => {
  const result = await readPdfText(pdfFixture(1));
  expect(result.status).toBe('available'); expect(result.pages).toBe(1); expect(result.text).toContain('Rational numbers: -2 + 3 = 1');
});
it('rejects an over-limit document rather than presenting a truncated first page', async () => {
  const result = await readPdfText(pdfFixture(26));
  expect(result.status).toBe('unavailable'); expect(result.text).toBe('');
});
it('reports malformed PDF as unavailable without an invented transcript', async () => {
  expect((await readPdfText(Buffer.from('%PDF-invalid'))).status).toBe('unavailable');
});
