// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderSolutionPng } from './solution-image-renderer';
import { solutionImageHtml, validateSolutionImage } from '../runtime/harness/solution-image.mjs';
const source = { title: '动量守恒：速度正负号', steps: [{title:'规定正方向', explanation:'选择向右为正方向。', formula:String.raw`m_1v_1+m_2v_2=m_1v_1^\prime+m_2v_2^\prime`}, {title:'代入带符号的速度', explanation:'向右为正，向左为负。', formula:String.raw`v_1=-2\,\mathrm{m/s}`}], conclusion:'先规定正方向，再带符号代入。' };
const longFormulaSource = { title: '一维动量守恒碰撞速度正负号判定三步法', steps: [{ title: '1. 规定正方向', explanation: '任意选取某一个物体的运动方向为正方向。与该方向相同的速度设为正值，相反的设为负值。', formula: String.raw`\text{规定向右为正方向：} v_1 > 0, v_2 < 0` }, { title: '2. 列出代数方程', explanation: '根据动量守恒定律列方程。带入已知速度时，必须连同它们对应的正负号一起带入。', formula: String.raw`m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'` }, { title: '3. 求解并解释正负', explanation: '解出未知的碰后速度。代数解为正表示与正方向相同，为负表示与正方向相反。', formula: String.raw`v_1' = \frac{m_1 v_1 + m_2 v_2 - m_2 v_2'}{m_1} \Rightarrow \text{根据正负判定方向}` }], conclusion: '列式前先画方向箭头并标明正方向；代数结果的正负号代表实际速度方向。' };
describe('solution image rendering', () => {
  it('escapes model text and rejects unsupported math and oversized content', () => {
    const html=solutionImageHtml({...source,title:'<script>alert(1)</script>'},'');
    expect(html).not.toContain('<script>');
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
  it('shrinks a long KaTeX formula to fit the solution card', async () => {
    const png=await renderSolutionPng(JSON.stringify(longFormulaSource));
    expect(png.subarray(1,4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1600);
    expect(png.readUInt32BE(20)).toBe(900);
  }, 30000);
});
