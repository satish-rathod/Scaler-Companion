import { useState, useEffect } from 'react';

const useTheme = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Read from localStorage or settings
    const savedSettings = localStorage.getItem('scaler_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.theme) setTheme(parsed.theme);
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Persist
    const saved = localStorage.getItem('scaler_settings');
    const settings = saved ? JSON.parse(saved) : {};
    if (settings.theme !== theme) {
      localStorage.setItem('scaler_settings', JSON.stringify({ ...settings, theme }));
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};

export default useTheme;
