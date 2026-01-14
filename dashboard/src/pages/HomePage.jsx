import { useState, useEffect } from 'react';
import { getRecordings, deleteRecording } from '../services/api';
import Layout from '../components/layout/Layout';
import RecordingCard from '../components/features/recording/RecordingCard';
import ProcessModal from '../components/features/processing/ProcessModal';
import { Loader } from 'lucide-react';

const HomePage = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);

  const fetchRecordings = async () => {
    try {
      const data = await getRecordings();
      setRecordings(data.recordings || []);
    } catch (err) {
      setError("Failed to load recordings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;
    try {
      await deleteRecording(id);
      fetchRecordings();
    } catch (err) {
      alert("Failed to delete recording");
    }
  };

  if (loading && recordings.length === 0) {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Library</h2>
          <p className="text-gray-500 mt-1">
            {recordings.length} recordings available
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((rec) => (
            <RecordingCard
              key={rec.id}
              recording={rec}
              onDelete={handleDelete}
              onProcess={() => setSelectedRecording(rec)}
            />
          ))}

          {recordings.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No recordings found.</p>
              <p className="text-sm text-gray-400 mt-2">Use the extension to download a lecture.</p>
            </div>
          )}
        </div>
      )}

      {selectedRecording && (
        <ProcessModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onSuccess={() => {
            fetchRecordings();
            // Optionally redirect to queue
          }}
        />
      )}
    </Layout>
  );
};

export default HomePage;
