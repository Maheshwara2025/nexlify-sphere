import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxdavbhvpvkrxetctymo.supabase.co';
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4ZGF2Ymh2cHZrcnhldGN0eW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzM0NDAsImV4cCI6MjEwMzc0OTQ0MH0.A77XfiDrjLJvTsK7Q06VopIG1nlF3fQhm2GhZmZ1BMc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);