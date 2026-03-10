import { useState, useEffect } from 'react';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('scaler_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.theme) return parsed.theme;
    }
  } catch {}
  return 'light';
}

const useTheme = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

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
