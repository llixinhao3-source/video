import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const mdComponents: Components = {
  h1: ({ children }) => <h1 className="text-[18px] font-bold text-[#1D1D1F] mt-6 mb-3 pb-2 border-b border-slate-100">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[16px] font-bold text-[#1D1D1F] mt-6 mb-3 pb-2 border-b border-slate-100">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[15px] font-bold text-[#1D1D1F] mt-5 mb-2.5 pb-1.5 border-b border-slate-100">{children}</h3>,
  h4: ({ children }) => <h4 className="text-[14px] font-semibold text-[#1D1D1F] mt-4 mb-2">{children}</h4>,
  p: ({ children }) => <p className="text-[13.5px] text-[#333] leading-[1.8] mb-3">{children}</p>,
  ul: ({ children }) => <ul className="space-y-1 mb-3">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1 mb-3">{children}</ol>,
  li: ({ children, node, ...props }) => {
    return (
      <li className="flex items-start gap-2 text-[13.5px] text-[#333] leading-[1.8]" {...props}>
        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
        <span className="flex-1">{children}</span>
      </li>
    )
  },
  strong: ({ children }) => <strong className="font-semibold text-[#1D1D1F]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#555]">{children}</em>,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <div className="relative mb-3">
          <pre className="p-4 rounded-xl bg-[#1D1D1F] text-[#E8E8ED] text-[12px] leading-[1.7] overflow-x-auto font-mono">
            <code className={className} {...props}>{children}</code>
          </pre>
        </div>
      )
    }
    return <code className="px-1.5 py-0.5 rounded-md bg-[#F5F5F7] text-[12px] font-mono text-[#007AFF]">{children}</code>
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <blockquote className="border-l-3 border-[#007AFF]/30 pl-4 py-1 my-3 bg-[#007AFF]/[0.03] rounded-r-lg">{children}</blockquote>,
  hr: () => <hr className="my-4 border-t border-slate-100" />,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-black/[0.06] mb-4">
      <table className="w-full text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-t border-black/[0.04] hover:bg-[#FAFAFA] transition-colors">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2.5 text-left font-semibold text-[#1D1D1F] bg-[#F5F5F7]">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2.5 text-[#333]">{children}</td>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#007AFF] hover:underline">{children}</a>,
}

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
