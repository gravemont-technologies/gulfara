import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import GulfaraLanding from './pages/GulfaraLanding';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import Profile from './pages/Profile';
import Rewards from './pages/Rewards';
import Layout from './components/Layout';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/" element={<GulfaraLanding />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/practice" element={<Layout><Practice /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/rewards" element={<Layout><Rewards /></Layout>} />
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;