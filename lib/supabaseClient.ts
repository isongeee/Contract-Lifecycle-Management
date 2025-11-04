// lib/supabaseClient.ts (browser)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yczmzgvrmcilgtfakaki.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljem16Z3ZybWNpbGd0ZmFrYWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTg1MDcsImV4cCI6MjA3Nzc3NDUwN30.sb1TRLWKniE9PtD827IklDyLdct6mXkEA7mUj9_2xWo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
