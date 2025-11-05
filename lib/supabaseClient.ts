// lib/supabaseClient.ts (browser)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sccfejeucaxhkyixjbvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjY2ZlamV1Y2F4aGt5aXhqYnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDYxODYsImV4cCI6MjA3NzkyMjE4Nn0.Fhi3q7uT4fIfwC05fdwSZBS21AAmgXZWQSugVuFEcj4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);