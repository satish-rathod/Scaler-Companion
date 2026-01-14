import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Save } from 'lucide-react';
import useTheme from '../hooks/useTheme';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    autoProcess: false,
    defaultWhisperModel: 'medium',
    defaultOllamaModel: 'gpt-oss:20b'
  });

  useEffect(() => {
    const saved = localStorage.getItem('scaler_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Remove theme from state as it's handled by hook
      delete parsed.theme;
      setSettings(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  const handleSave = () => {
    // Preserve theme in storage via hook logic, but here we save other settings
    // Actually the hook manages 'theme' key in same storage object potentially?
    // Let's keep them separate or merge carefully.
    // The hook writes to 'scaler_settings'. We should read current, update fields, write back.
    const current = JSON.parse(localStorage.getItem('scaler_settings') || '{}');
    const updated = { ...current, ...settings };
    localStorage.setItem('scaler_settings', JSON.stringify(updated));
    alert('Settings saved!');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Settings</h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

          <div>
            <h3 className="font-medium text-notion-text mb-4">Appearance</h3>
            <div className="flex items-center justify-between p-4 border border-notion-border rounded-lg">
              <span className="text-sm font-medium text-notion-text">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-notion-text mb-4">Defaults</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-notion-text mb-1">
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
