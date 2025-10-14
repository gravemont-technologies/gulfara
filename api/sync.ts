// api/sync.ts (Vite serverless function on Vercel)
import { createClient } from '@supabase/supabase-js'; // Assume installed
import { syncFunction } from '../services/sync'; // Adapt from your sync.js

export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  // Example: Aggregate data from Supabase or other APIs
  const { data, error } = await supabase.from('decks').select('*'); // Adapt to your schema
  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  // Call your sync logic if needed
  const syncedData = await syncFunction(data);

  return new Response(JSON.stringify(syncedData), { status: 200 });
}