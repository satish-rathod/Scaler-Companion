import StatusBadge from '../recording/StatusBadge';

const QueueList = ({ items, title, emptyMessage }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-700">{title}</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.id || item.processId} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{item.title}</span>
              <StatusBadge status={item.status} />
            </div>
            {item.message && (
              <p className="text-sm text-gray-500 mb-2">{item.message}</p>
            )}
            {/* Progress Bar */}
            {(item.progress !== undefined) && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueueList;
