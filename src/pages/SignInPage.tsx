import { SignIn } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

export default function SignInPage() {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useUser();
  const fromPath =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app';

  if (isLoaded && isSignedIn) {
    return <Navigate to={fromPath} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Welcome to Gulfara
          </h1>
          <p className="text-gray-600">
            Sign in to personalize your Gulf Arabic journey.
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}

