// Supabase connection details.
// Find these in your Supabase project: Settings -> API
//   - Project URL          -> SUPABASE_URL
//   - anon / public API key -> SUPABASE_ANON_KEY
//
// Safe to expose in client-side code: the anon key only grants what your
// Row Level Security policies allow. jobs_master currently allows
// public SELECT and UPDATE (see your schema), so that's all this key can do.

window.SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
