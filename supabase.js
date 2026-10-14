/* PAVO Club — Supabase client configuration.
   Replace the two placeholders with your Supabase Project URL and publishable/anon key.
   Never put a service_role or secret key in browser code. */
const SUPABASE_URL = 'https://slxbpxnwgfiuktkmfjqp.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_ZwXt23LTUN8Sfc_MRNFfGw_Tri2zabK';
const supabaseReady = !SUPABASE_URL.includes('YOUR-PROJECT-REF') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
const supabaseClient = supabaseReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
