import { createContext, ReactNode, useContext } from 'react';
import { useEnsureProfile, ProfileRecord } from '@/hooks/useEnsureProfile';

interface ProfileContextValue {
  profile: ProfileRecord;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: ProfileRecord) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
    <div className="text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse" />
      <p className="text-gray-600 font-medium">Preparing your learning space...</p>
    </div>
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center bg-red-50">
    <div className="max-w-md text-center space-y-4">
      <h2 className="text-xl font-semibold text-red-700">We hit a snag setting up your profile</h2>
      <p className="text-red-600 text-sm">
        {error.message}
      </p>
      <p className="text-sm text-red-500">
        Please refresh the page or contact support if the issue persists.
      </p>
    </div>
  </div>
);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const {
    profile,
    status,
    error,
    refreshProfile: refresh,
    setProfile,
  } = useEnsureProfile();

  if (status === 'idle' || status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'error' || !profile) {
    return <ErrorState error={error ?? new Error('Unknown profile error')} />;
  }

  const value: ProfileContextValue = {
    profile,
    refreshProfile: refresh,
    setProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

