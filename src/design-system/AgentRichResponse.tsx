import { Children, createElement, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import styles from './AgentRichResponse.module.css';

const components: Components = {
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
  table: ({ children }) => <div className={styles.tableScroll}><table>{children}</table></div>,
};

type AgentRichResponseProps = Readonly<{
  children: string;
  className?: string;
  mentionLabels?: readonly string[];
}>;

function highlightMentions(children: ReactNode, labels: readonly string[]): ReactNode {
  const names = [...new Set(labels.filter(Boolean))].sort((a, b) => b.length - a.length);
  return Children.map(children, (child) => {
    if (typeof child !== 'string' || !child.includes('@')) return child;
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (let at = child.indexOf('@'); at >= 0; at = child.indexOf('@', at + 1)) {
      // A mention starts at a text boundary, never inside an email or URL.
      if (at > 0 && !/[\s，。！？；：、,!?;:（(【[]/.test(child[at - 1]!)) continue;
      const name = names.find((label) => {
        if (!child.startsWith(label, at + 1)) return false;
        const next = child[at + label.length + 1];
        return label === '所有人' || !next || /[\s，。！？；：、,!?;:（）()【】[\]@]/.test(next);
      });
      if (!name) continue;
      parts.push(child.slice(cursor, at));
      cursor = at + name.length + 1;
      parts.push(<span key={at} className={styles.mention} data-message-mention={name}>{child.slice(at, cursor)}</span>);
      at = cursor - 1;
    }
    parts.push(child.slice(cursor));
    return parts;
  });
}

export function AgentRichResponse({ children, className, mentionLabels }: AgentRichResponseProps) {
  const mentionComponents: Components = useMemo(() => mentionLabels ? Object.fromEntries(
    (['p', 'li', 'strong', 'em', 'del', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) => [
      tag, ({ children: content, node, ...props }: HTMLAttributes<HTMLElement> & { node?: unknown }) => {
        void node;
        return createElement(tag, props, highlightMentions(content, mentionLabels));
      },
    ]),
  ) : {}, [mentionLabels]);
  return (
    <div className={[styles.response, className].filter(Boolean).join(' ')} data-agent-rich-response="true">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: false, maxExpand: 1000 }]]} components={{ ...components, ...mentionComponents }} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
