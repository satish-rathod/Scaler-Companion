import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownViewer = ({ content }) => {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No content available.
      </div>
    );
  }

  return (
    <div className="prose prose-blue max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
