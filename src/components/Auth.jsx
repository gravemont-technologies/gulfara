import { memo } from 'react';
import { SignIn, SignUp, ClerkProvider, RedirectToSignIn } from '@clerk/clerk-react';
import { useUser } from '@clerk/clerk-react';

const Auth = memo(() => {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <SignIn routing="hash" />
        <SignUp routing="hash" />
      </div>
    );
  }

  return <RedirectToSignIn />;
});

export default Auth;