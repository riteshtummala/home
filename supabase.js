// ===========================
// Supabase Client
// ===========================
const SUPABASE_URL = 'https://bplothzhxnlzyiwfjazq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbG90aHpoeG5senlpd2ZqYXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODg3ODUsImV4cCI6MjA5MjE2NDc4NX0.NJZz6mzjczwpo_5QUlkwiKUFX8duBQsQtLl00ohEIXU';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
