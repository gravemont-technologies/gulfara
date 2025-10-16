import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './contexts/LanguageContext';
import GulfaraLanding from './pages/GulfaraLanding';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import Profile from './pages/Profile';
import Rewards from './pages/Rewards';
import Layout from './components/Layout';

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <Router>
            <Routes>
              <Route path="/" element={<GulfaraLanding />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/app" element={<Layout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="practice" element={<Practice />} />
                <Route path="profile" element={<Profile />} />
                <Route path="rewards" element={<Rewards />} />
              </Route>
            </Routes>
          </Router>
        </LanguageProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;