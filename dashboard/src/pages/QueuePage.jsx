import { useState, useEffect } from 'react';
import { getQueueStatus } from '../services/api';
import Layout from '../components/layout/Layout';
import QueueTable from '../components/features/queue/QueueTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Activity } from 'lucide-react';

const QueuePage = () => {
  const [data, setData] = useState({ queue: [], history: [] });
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const result = await getQueueStatus();
      setData(result);
    } catch (err) {
      console.error('Failed to load queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Processing Queue</h2>
        <p className="text-muted-foreground mt-1">Monitor active and completed jobs</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-3">Active & Completed Jobs</h3>
            <Separator className="mb-4" />
            <QueueTable items={data.history} emptyMessage="No active jobs" />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Waiting</h3>
            <Separator className="mb-4" />
            <QueueTable items={data.queue} emptyMessage="Queue is empty" />
          </section>
        </div>
      )}
    </Layout>
  );
};

export default QueuePage;
