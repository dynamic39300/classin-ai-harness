import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentRichResponse } from './AgentRichResponse';

describe('AgentRichResponse', () => {
  it('renders GFM as semantic LUI content instead of raw markdown markers', () => {
    const { container } = render(<AgentRichResponse>{`### 建议话术

> 先肯定，再说明下一步。

| 要点 | 落实方式 |
| --- | --- |
| 时间 | 周一 18:00 前 |

- [x] 说明原因`}</AgentRichResponse>);

    expect(screen.getByRole('heading', { name: '建议话术', level: 3 })).toBeVisible();
    expect(container.querySelector('blockquote')).toHaveTextContent('先肯定，再说明下一步。');
    expect(screen.getByRole('table')).toHaveTextContent('周一 18:00 前');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(container).not.toHaveTextContent('###');
    expect(container).not.toHaveTextContent('| --- |');
  });

  it('does not execute model supplied HTML', () => {
    const { container } = render(<AgentRichResponse>{'<script>window.compromised = true</script>\n\n安全正文'}</AgentRichResponse>);
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('安全正文');
  });
});

it('typesets the reported inline and adjacent display equations, fractions and units', () => {
  const { container } = render(<AgentRichResponse>{String.raw`每天 $420 \times 16 = 6720$ 本。

$$960 + 420 \times 16$$ $$= 960 + 6720$$ $$= 7680 \text{(本)}$$

分数 $\frac{1}{2}$ 和平方 $x^2$。`}</AgentRichResponse>);
  expect(container.querySelectorAll('.katex').length).toBe(6);
  expect(container.querySelectorAll('math').length).toBe(6);
  expect(container.querySelector('.katex-error')).toBeNull();
  expect(container.querySelector('.katex-html')).toHaveTextContent('×');
});

it('keeps code literal and survives invalid or unfinished streamed formulas', () => {
  const { container } = render(<AgentRichResponse>{String.raw`代码：\`$x^2$\`

$\unknowncommand{1}$

未完成 $\frac{1}`.replaceAll('\\`', '`')}</AgentRichResponse>);
  expect(container.querySelector('code')).toHaveTextContent('$x^2$');
  expect(container).toHaveTextContent('未完成');
});
