import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '../recording/StatusBadge';
import { Inbox } from 'lucide-react';

const QueueTable = ({ items, emptyMessage }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recording</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id || item.processId}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="w-40">
                {item.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8">
                      {Math.round(item.progress)}%
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {item.startedAt
                  ? formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })
                  : '-'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {item.message || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default QueueTable;
