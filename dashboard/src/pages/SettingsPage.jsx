import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Save, CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import { getSettings, updateSettings, getProviders, getModels } from '../services/api';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [providers, setProviders] = useState({});
  const [models, setModels] = useState([]);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState({
    llmProvider: 'ollama',
    llmModel: '',
    ollamaBaseUrl: 'http://localhost:11434',
    openaiApiKey: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsData, providersData, modelsData] = await Promise.all([
          getSettings(),
          getProviders(),
          getModels(),
        ]);
        setSettings(settingsData);
        setProviders(providersData);
        setModels(modelsData.llm || []);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProviderChange = async (provider) => {
    setSettings(prev => ({ ...prev, llmProvider: provider }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const data = await getProviders();
      setProviders(data);
      const active = data[settings.llmProvider];
      if (active?.connected) {
        setMessage({ type: 'success', text: 'Connection successful!' });
      } else {
        setMessage({ type: 'error', text: active?.reason || 'Connection failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection test failed: ' + err.message });
    } finally {
      setTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      const modelsData = await getModels();
      setModels(modelsData.llm || []);
      setMessage({ type: 'success', text: 'Settings saved!' });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setMessage({ type: 'error', text: 'Failed to save: ' + detail });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h2>

        {message && (
          <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* LLM Provider Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">LLM Provider</h3>

            {/* Provider Toggle */}
            <div className="flex gap-3">
              {['ollama', 'openai'].map(p => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    settings.llmProvider === p
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{p === 'ollama' ? 'Ollama' : 'OpenAI'}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {p === 'ollama' ? 'Local / Free' : 'Cloud / API Key'}
                  </div>
                </button>
              ))}
            </div>

            {/* Provider-specific config */}
            {settings.llmProvider === 'ollama' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  value={settings.ollamaBaseUrl}
                  onChange={e => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="http://localhost:11434"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.openaiApiKey}
                    onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Connection status + test button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {providers[settings.llmProvider]?.connected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-700 dark:text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-700 dark:text-red-400">Not connected</span>
                  </>
                )}
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
              >
                {testing && <Loader className="w-3 h-3 animate-spin" />}
                Test Connection
              </button>
            </div>

            {/* Model selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Model
              </label>
              <select
                value={settings.llmModel}
                onChange={e => setSettings({ ...settings, llmModel: e.target.value })}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {models.length === 0 && (
                  <option value="">No models available</option>
                )}
              </select>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Appearance</h3>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
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

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
