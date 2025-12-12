// ARCHIVED: Supabase mocks removed.
// All persistence now handled via Firebase/Firestore.
// Tests should mock lib/firestore/* modules instead.

import { vi } from 'vitest';

// Legacy export for backward compatibility (no-op)
export function mockSupabaseClient<T>(data: T, error: any = null) {
  console.warn('mockSupabaseClient is deprecated. Use Firestore mocks instead.');
  return { createClient: vi.fn(), from: vi.fn() };
}


