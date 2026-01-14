import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { getModels, startProcessing } from '../../../services/api';

const ProcessModal = ({ recording, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [models, setModels] = useState({ whisper: [], ollama: [] });
  const [config, setConfig] = useState({
    whisperModel: 'medium',
    ollamaModel: '',
    skipTranscription: false,
    skipFrames: false,
    skipNotes: false,
  });

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await getModels();
        setModels(data);
        if (data.ollama.length > 0) {
          setConfig(prev => ({ ...prev, ollamaModel: data.ollama[0] }));
        }
      } catch (err) {
        console.error("Failed to load models", err);
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
        ...config
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert("Failed to start processing: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-6">Process Lecture</h2>

        <div className="mb-6 bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800 font-medium line-clamp-1">
            Target: {recording.title}
          </p>
        </div>

        {initializing ? (
          <div className="flex justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transcription Model (Whisper)
              </label>
              <select
                value={config.whisperModel}
                onChange={e => setConfig({...config, whisperModel: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {models.whisper.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes Model (Ollama)
              </label>
              <select
                value={config.ollamaModel}
                onChange={e => setConfig({...config, ollamaModel: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {models.ollama.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.skipTranscription}
                  onChange={e => setConfig({...config, skipTranscription: e.target.checked})}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-600">Skip Transcription (Use existing)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.skipFrames}
                  onChange={e => setConfig({...config, skipFrames: e.target.checked})}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-600">Skip Slide Extraction</span>
              </label>
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                Start Processing
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProcessModal;
