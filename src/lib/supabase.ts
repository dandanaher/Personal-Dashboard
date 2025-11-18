import { createClient } from '@supabase/supabase-js';

console.log('Supabase client initializing...');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Log environment variable status
console.log('Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING');
console.log('Supabase Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `Supabase credentials missing!
    VITE_SUPABASE_URL: ${supabaseUrl ? 'set' : 'MISSING'}
    VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'set' : 'MISSING'}

    Please create a .env file with:
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`;

  console.error(errorMsg);
  // Don't throw - allow app to load but auth will fail
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

console.log('Supabase client created successfully');

export const supabaseAuth = supabase.auth;

export default supabase;
