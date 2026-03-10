import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Play, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StatusBadge from './StatusBadge';

const RecordingCard = ({ recording, onDelete, onProcess }) => {
  const navigate = useNavigate();
  const isProcessed = recording.status === 'complete' || recording.status === 'processed';
  const isActive = recording.status === 'downloading' || recording.status === 'processing';

  const handleCardClick = () => {
    if (isProcessed) {
      navigate(`/recording/${recording.id}`);
    } else if (recording.status === 'downloaded') {
      if (onProcess) onProcess(recording);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <CardTitle className="truncate text-sm">{recording.title}</CardTitle>
        </div>
        <CardAction onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isProcessed && (
                <DropdownMenuItem onClick={() => navigate(`/recording/${recording.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              {recording.status === 'downloaded' && (
                <DropdownMenuItem onClick={() => onProcess?.(recording)}>
                  <Play className="mr-2 h-4 w-4" />
                  Process
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(recording.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {format(new Date(recording.date || Date.now()), 'MMM d, yyyy')}
          </span>
          <StatusBadge status={recording.status} />
        </div>

        {isActive && recording.progress > 0 && (
          <Progress value={recording.progress} className="h-1.5" />
        )}
      </CardContent>
    </Card>
  );
};

export default RecordingCard;
