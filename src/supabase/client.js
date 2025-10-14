import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/clerk-react';

export const useSupabaseClient = () => {
  const { getToken } = useAuth();

  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await getToken();
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${clerkToken}`,
          };
          return fetch(url, options);
        },
      },
    }
  );
};