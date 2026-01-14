import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownViewer = ({ content }) => {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-notion-dim italic">
        Empty page
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none
      prose-headings:font-semibold prose-headings:text-notion-text
      prose-p:text-notion-text prose-p:leading-7
      prose-a:text-notion-text prose-a:underline prose-a:decoration-gray-300 prose-a:underline-offset-2
      prose-code:text-red-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-notion-sidebar prose-pre:text-notion-text prose-pre:border prose-pre:border-notion-border
      prose-li:text-notion-text
      prose-strong:text-notion-text prose-strong:font-semibold
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
