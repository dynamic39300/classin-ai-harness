import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AgentRichResponse.module.css';

const components: Components = {
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
  table: ({ children }) => <div className={styles.tableScroll}><table>{children}</table></div>,
};

type AgentRichResponseProps = Readonly<{
  children: string;
  className?: string;
}>;

export function AgentRichResponse({ children, className }: AgentRichResponseProps) {
  return (
    <div className={[styles.response, className].filter(Boolean).join(' ')} data-agent-rich-response="true">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
