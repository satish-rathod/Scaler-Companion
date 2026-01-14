import clsx from 'clsx';

const StatusBadge = ({ status }) => {
  const colors = {
    processed: "bg-green-100 text-green-800",
    downloaded: "bg-blue-100 text-blue-800",
    downloading: "bg-gray-100 text-gray-600",
    processing: "bg-orange-100 text-orange-800",
    queued: "bg-gray-100 text-gray-600",
    error: "bg-red-100 text-red-800",
  };

  return (
    <span className={clsx(
      "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
      colors[status] || colors.queued
    )}>
      {status}
    </span>
  );
};

export default StatusBadge;
