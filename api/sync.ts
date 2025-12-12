// api/sync.ts (Vite serverless function on Vercel)
// ARCHIVED: Supabase removed. Replace with Firebase/Firestore persistence.

import { adminDb } from '../lib/firebase/admin'

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // TODO: Replace with Firebase/Firestore sync logic. Defer admin init
  // until actual persistence work is required so tests that exercise
  // request handling do not fail when admin env is absent.
  console.warn('sync handler: Supabase removed, implement Firebase persistence.');

  return new Response(JSON.stringify({ data: [], message: 'Sync endpoint stubbed during migration' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}