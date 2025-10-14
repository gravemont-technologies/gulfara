import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import GulfaraLanding from "./pages/GulfaraLanding";

// Lazy load components for better performance
const Layout = lazy(() => import('./components/Layout'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Practice = lazy(() => import('./pages/Practice'));
const Profile = lazy(() => import('./pages/Profile'));
const Rewards = lazy(() => import('./pages/Rewards'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
  },
});

// Gulfara loading component with Arabic-inspired design
const GulfaraLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Gulfara</h2>
      <p className="text-gray-600">Loading your Arabic journey...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<GulfaraLoader />}>
              <div className="min-h-screen bg-white">
                <Routes>
                  <Route path="/" element={<GulfaraLanding />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/app" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="practice/:scenario" element={<Practice />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="rewards" element={<Rewards />} />
                  </Route>
                </Routes>
              </div>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;