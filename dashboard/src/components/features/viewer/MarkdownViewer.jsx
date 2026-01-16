import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownViewer = ({ content }) => {
  if (!content) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No content available</p>
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styled headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-medium text-gray-700 mt-5 mb-2">
              {children}
            </h3>
          ),
          // Readable paragraphs
          p: ({ children }) => (
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              {children}
            </p>
          ),
          // Styled lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-base leading-relaxed">{children}</li>
          ),
          // Styled tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
          ),
          // Code blocks
          code: ({ inline, children }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                <code className="text-sm font-mono">{children}</code>
              </pre>
            );
          },
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-4 bg-blue-50 rounded-r-lg italic text-gray-700">
              {children}
            </blockquote>
          ),
          // Links
          a: ({ href, children }) => (
            <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Horizontal rule
          hr: () => <hr className="my-8 border-gray-200" />,
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
