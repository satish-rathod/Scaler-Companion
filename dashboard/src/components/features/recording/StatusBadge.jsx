import { Badge } from '@/components/ui/badge';

const statusConfig = {
  processed: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  complete: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  downloaded: { variant: 'secondary', className: '' },
  downloading: { variant: 'secondary', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  processing: { variant: 'secondary', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  queued: { variant: 'outline', className: '' },
  waiting: { variant: 'outline', className: '' },
  error: { variant: 'destructive', className: '' },
  failed: { variant: 'destructive', className: '' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.queued;

  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  );
};

export default StatusBadge;
