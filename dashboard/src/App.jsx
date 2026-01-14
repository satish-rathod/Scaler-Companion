import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ViewerPage from './pages/ViewerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recording/:id" element={<ViewerPage />} />
        {/* Placeholders for routes in sidebar */}
        <Route path="/queue" element={<HomePage />} />
        <Route path="/settings" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
