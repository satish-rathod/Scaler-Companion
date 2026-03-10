import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Save, Eye, EyeOff } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import { getSettings, updateSettings, getProviders, getModels } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [providers, setProviders] = useState({});
  const [models, setModels] = useState([]);
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
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProviderChange = (provider) => {
    setSettings(prev => ({ ...prev, llmProvider: provider }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const data = await getProviders();
      setProviders(data);
      const active = data[settings.llmProvider];
      if (active?.connected) {
        toast.success('Connection successful!');
      } else {
        toast.error(active?.reason || 'Connection failed');
      }
    } catch (err) {
      toast.error('Connection test failed: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      const modelsData = await getModels();
      setModels(modelsData.llm || []);
      toast.success('Settings saved');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      toast.error('Failed to save: ' + detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  const isConnected = providers[settings.llmProvider]?.connected;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        {/* LLM Provider Card */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Provider</CardTitle>
            <CardDescription>Configure the AI model used for generating notes and summaries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Provider Toggle */}
            <div className="flex gap-3">
              {['ollama', 'openai'].map((p) => (
                <Button
                  key={p}
                  variant={settings.llmProvider === p ? 'default' : 'outline'}
                  className="flex-1 h-auto py-3 flex-col"
                  onClick={() => handleProviderChange(p)}
                >
                  <span className="font-semibold">{p === 'ollama' ? 'Ollama' : 'OpenAI'}</span>
                  <span className="text-xs opacity-70 mt-0.5">
                    {p === 'ollama' ? 'Local / Free' : 'Cloud / API Key'}
                  </span>
                </Button>
              ))}
            </div>

            <Separator />

            {/* Provider Config */}
            {settings.llmProvider === 'ollama' ? (
              <div className="space-y-2">
                <Label htmlFor="ollama-url">Ollama Base URL</Label>
                <Input
                  id="ollama-url"
                  value={settings.ollamaBaseUrl}
                  onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.openaiApiKey}
                    onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <Badge variant={isConnected ? 'default' : 'destructive'} className={isConnected ? 'bg-green-600 hover:bg-green-600' : ''}>
                {isConnected ? 'Connected' : 'Not connected'}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing}>
                {testing && <Spinner className="mr-2 h-3 w-3" />}
                Test Connection
              </Button>
            </div>

            <Separator />

            {/* Model Selector */}
            <div className="space-y-2">
              <Label>Default Model</Label>
              {models.length > 0 ? (
                <Select
                  value={settings.llmModel}
                  onValueChange={(value) => setSettings({ ...settings, llmModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No models available. Check your provider connection.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
