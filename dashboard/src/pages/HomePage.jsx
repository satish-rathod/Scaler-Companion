import { useState, useEffect } from 'react';
import { getRecordings, deleteRecording } from '../services/api';
import Layout from '../components/layout/Layout';
import RecordingCard from '../components/features/recording/RecordingCard';
import ProcessModal from '../components/features/processing/ProcessModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const HomePage = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);

  const fetchRecordings = async () => {
    try {
      const data = await getRecordings();
      setRecordings(data.recordings || []);
      setError(null);
    } catch (err) {
      setError("Failed to load recordings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteRecording(id);
      toast.success('Recording deleted');
      fetchRecordings();
    } catch (err) {
      toast.error('Failed to delete recording');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Library</h2>
          <p className="text-muted-foreground mt-1">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {loading && recordings.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 border rounded-xl">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={fetchRecordings}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No recordings yet</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Use the Chrome extension to capture a lecture from Scaler Academy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recordings.map((rec) => (
            <RecordingCard
              key={rec.id}
              recording={rec}
              onDelete={handleDelete}
              onProcess={() => setSelectedRecording(rec)}
            />
          ))}
        </div>
      )}

      {selectedRecording && (
        <ProcessModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onSuccess={() => {
            fetchRecordings();
          }}
        />
      )}
    </Layout>
  );
};

export default HomePage;
