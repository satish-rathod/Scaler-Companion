import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Play, FileText, Trash2, MoreVertical } from 'lucide-react';
import StatusBadge from './StatusBadge';

const RecordingCard = ({ recording, onDelete }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (recording.status === 'processed' || recording.status === 'downloaded') {
      // In V2 we might want to view downloaded ones too,
      // but typically we process them first.
      // For now, let's allow navigation to viewer for both.
      navigate(`/recording/${recording.id}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div
        className="h-40 bg-gray-100 relative cursor-pointer group-hover:bg-gray-200 transition-colors flex items-center justify-center"
        onClick={handleCardClick}
      >
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Play className="w-5 h-5 text-gray-700 ml-1" />
        </div>

        {/* Progress Overlay for downloading/processing */}
        {recording.progress > 0 && recording.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${recording.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3
            className="font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600"
            onClick={handleCardClick}
          >
            {recording.title}
          </h3>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(recording.id); }}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{format(new Date(recording.date || Date.now()), 'MMM d, yyyy')}</span>
          </div>
          <StatusBadge status={recording.status} />
        </div>
      </div>
    </div>
  );
};

export default RecordingCard;
