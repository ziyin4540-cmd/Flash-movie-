// Supabase SDK 初始化
const SUPABASE_URL = 'https://ryuyohpepzxonnmzkeub.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXlvaHBlcHp4b25ubXprZXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTc5NDQsImV4cCI6MjEwNzA5Mzk0NH0.IwsHrB-ST8hIqkRwsw_sYryf7sbgKPgtSNju7WBmxDM';

// Window အောက်မှာ အခြား JS ဖိုင်တွေ ခေါ်သုံးလို့ရအောင် သေချာ ထုတ်ပေးခြင်း
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
