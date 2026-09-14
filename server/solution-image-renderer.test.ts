// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderSolutionPng } from './solution-image-renderer';
import { solutionImageHtml, validateSolutionImage } from '../runtime/harness/solution-image.mjs';
const source = { title: '动量守恒：速度正负号', steps: [{title:'规定正方向', explanation:'选择向右为正方向。', formula:String.raw`m_1v_1+m_2v_2=m_1v_1^\prime+m_2v_2^\prime`}, {title:'代入带符号的速度', explanation:'向右为正，向左为负。', formula:String.raw`v_1=-2\,\mathrm{m/s}`}], conclusion:'先规定正方向，再带符号代入。' };
describe('solution image rendering', () => {
  it('escapes model text and rejects unsupported math and oversized content', () => {
    const html=solutionImageHtml({...source,title:'<script>alert(1)</script>'},'');
    expect(html).not.toContain('<script>');
    expect(html).toContain('AI 消息助手 / 解题步骤');
    expect(()=>validateSolutionImage({...source,steps:[]})).toThrow();
    expect(()=>validateSolutionImage({...source,title:'x'.repeat(61)})).toThrow();
    expect(()=>validateSolutionImage({...source,steps:[{...source.steps[0],formula:'\\unknownmacro{x}'},source.steps[1]]})).toThrow();
  });
  it('produces a real 1600 by 900 PNG without network access', async () => {
    const png=await renderSolutionPng(JSON.stringify(source));
    expect(png.subarray(1,4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1600);
    expect(png.readUInt32BE(20)).toBe(900);
  }, 30000);
});
