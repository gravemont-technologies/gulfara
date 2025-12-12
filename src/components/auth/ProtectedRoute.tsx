import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ProfileProvider } from '@/contexts/ProfileContext';

const LoadingView = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
    <div className="text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-ping" />
      <p className="text-gray-600 font-medium">Loading your Gulfara experience...</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <LoadingView />;
  }

  if (!isSignedIn) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location }}
      />
    );
  }

  return (
    <ProfileProvider>
      {children}
    </ProfileProvider>
  );
};

