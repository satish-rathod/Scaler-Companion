import clsx from 'clsx';
import { CheckCircle, Clock, AlertCircle, Loader, FileText } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const styles = {
    processed: "bg-green-100 text-green-700",
    downloaded: "bg-blue-100 text-blue-700",
    downloading: "bg-blue-50 text-blue-600",
    processing: "bg-purple-100 text-purple-700",
    queued: "bg-gray-100 text-gray-700",
    error: "bg-red-100 text-red-700",
  };

  const icons = {
    processed: CheckCircle,
    downloaded: FileText,
    downloading: Loader,
    processing: Loader,
    queued: Clock,
    error: AlertCircle,
  };

  const Icon = icons[status] || Clock;
  const isSpinning = status === 'processing' || status === 'downloading';

  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
      styles[status] || styles.queued
    )}>
      <Icon className={clsx("w-3.5 h-3.5", isSpinning && "animate-spin")} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;
