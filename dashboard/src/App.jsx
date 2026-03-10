import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import HomePage from './pages/HomePage';
import ViewerPage from './pages/ViewerPage';
import QueuePage from './pages/QueuePage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';

function App() {
  return (
    <TooltipProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recording/:id" element={<ViewerPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </Router>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
