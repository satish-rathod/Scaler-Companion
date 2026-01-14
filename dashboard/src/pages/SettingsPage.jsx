import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Save } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    autoProcess: false,
    defaultWhisperModel: 'medium',
    defaultOllamaModel: 'gpt-oss:20b'
  });

  useEffect(() => {
    const saved = localStorage.getItem('scaler_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('scaler_settings', JSON.stringify(settings));
    alert('Settings saved!');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Settings</h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Defaults</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Whisper Model
                </label>
                <select
                  value={settings.defaultWhisperModel}
                  onChange={e => setSettings({...settings, defaultWhisperModel: e.target.value})}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="tiny">Tiny (Fastest)</option>
                  <option value="base">Base</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="large">Large (Best Quality)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoProcess}
                  onChange={e => setSettings({...settings, autoProcess: e.target.checked})}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Auto-process downloads when finished</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
