import { useState, useEffect } from 'react';
import { getModels, startProcessing } from '../../../services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const ProcessModal = ({ recording, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [models, setModels] = useState({ whisper: [], llm: [], llmProvider: 'ollama' });
  const [config, setConfig] = useState({
    whisperModel: 'turbo',
    llmModel: '',
    skipTranscription: false,
    skipFrames: false,
    skipNotes: false,
  });

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await getModels();
        setModels(data);
        if (data.llm && data.llm.length > 0) {
          setConfig(prev => ({ ...prev, llmModel: data.llm[0] }));
        }
      } catch (err) {
        toast.error('Failed to load models');
        console.error(err);
      } finally {
        setInitializing(false);
      }
    };
    fetchModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await startProcessing({
        title: recording.title,
        videoPath: recording.videoPath,
        ...config,
      });
      toast.success('Processing started');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to start processing: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Recording</DialogTitle>
          <DialogDescription className="truncate">
            {recording.title}
          </DialogDescription>
        </DialogHeader>

        {initializing ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-48" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="whisper-model">Transcription Model (Whisper)</Label>
                <Select
                  value={config.whisperModel}
                  onValueChange={(value) => setConfig({ ...config, whisperModel: value })}
                >
                  <SelectTrigger id="whisper-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.whisper.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="llm-model">Notes Model</Label>
                  <Badge variant="outline" className="text-xs">
                    {models.llmProvider === 'openai' ? 'OpenAI' : 'Ollama'}
                  </Badge>
                </div>
                <Select
                  value={config.llmModel}
                  onValueChange={(value) => setConfig({ ...config, llmModel: value })}
                >
                  <SelectTrigger id="llm-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {(models.llm || []).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-transcription"
                    checked={config.skipTranscription}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, skipTranscription: checked })
                    }
                  />
                  <Label htmlFor="skip-transcription" className="font-normal">
                    Skip Transcription (use existing)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-frames"
                    checked={config.skipFrames}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, skipFrames: checked })
                    }
                  />
                  <Label htmlFor="skip-frames" className="font-normal">
                    Skip Slide Extraction
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                Start Processing
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProcessModal;
