const SUPABASE_URL = 'https://ryuyohpepzxonnmzkeub.supabase.co';
const SUPABASE_KEY = 'sb_publishable_reqGR-l6d4MPeV8xcz25lw_-H3_J5ex';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
