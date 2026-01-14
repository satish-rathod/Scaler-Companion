import { useState, useEffect } from 'react';
import { getQueueStatus } from '../services/api';
import Layout from '../components/layout/Layout';
import QueueList from '../components/features/queue/QueueList';
import { Loader } from 'lucide-react';

const QueuePage = () => {
  const [data, setData] = useState({ queue: [], history: [] });
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const result = await getQueueStatus();
      setData(result);
    } catch (err) {
      console.error("Failed to load queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Processing Queue</h2>
      </div>

      <div className="grid gap-8">
        <QueueList
          items={data.history}
          title="Active & Completed Jobs"
          emptyMessage="No active jobs."
        />

        <QueueList
          items={data.queue}
          title="Waiting"
          emptyMessage="Queue is empty."
        />
      </div>
    </Layout>
  );
};

export default QueuePage;
