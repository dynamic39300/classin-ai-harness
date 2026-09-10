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
