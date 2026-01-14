import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, MoreHorizontal } from 'lucide-react';
import StatusBadge from './StatusBadge';

const RecordingCard = ({ recording, onDelete, onProcess }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (recording.status === 'processed') {
      navigate(`/recording/${recording.id}`);
    } else if (recording.status === 'downloaded') {
      if (onProcess) onProcess(recording);
    }
  };

  return (
    <div
      className="group relative flex flex-col gap-2 p-2 rounded-md hover:bg-notion-hover transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Cover / Icon Area */}
      <div className="h-32 w-full bg-notion-sidebar rounded-md border border-notion-border flex items-center justify-center relative overflow-hidden">
        {recording.status === 'processed' ? (
          <div className="text-4xl">📄</div>
        ) : (
          <div className="text-4xl opacity-50">⬇️</div>
        )}

        {/* Progress Overlay */}
        {recording.progress > 0 && recording.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-notion-border">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${recording.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-medium text-notion-text text-sm truncate group-hover:underline decoration-notion-dim underline-offset-4">
          {recording.title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-xs text-notion-dim">
            {format(new Date(recording.date || Date.now()), 'MMM d, yyyy')}
          </span>
          <StatusBadge status={recording.status} />
        </div>
      </div>

      {/* Hover Actions (Notion style: appears on hover) */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(recording.id); }}
          className="p-1 rounded hover:bg-white/50 text-notion-dim hover:text-red-500"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RecordingCard;
