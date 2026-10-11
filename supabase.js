/* PAVO Club — Supabase configuration (the ONLY place to edit).
   URL = Project URL only (https://xxxx.supabase.co) — NO /rest/v1/ and no trailing slash.
   Key = publishable/anon key. Never put a secret or service_role key here. */
const SUPABASE_URL = 'https://slxbpxnwgfiuktkmfjqp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZwXt23LTUN8Sfc_MRNFfGw_Tri2zabK';
const supabaseClient = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
