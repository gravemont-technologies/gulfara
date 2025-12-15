export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Archived: Supabase landing</h1>
        <p className="mb-4">This component previously used Supabase for email collection. The Supabase implementation has been archived and moved to <code>gulfara/archive/supabase-migration/</code>.</p>
        <p className="text-sm text-gray-600">If you need the original implementation restored, run: <code>git restore --source=HEAD@{1} -- gulfara/gulfara/src/Landing.tsx</code> or retrieve it from the archive path above.</p>
      </div>
    </div>
  );
}
