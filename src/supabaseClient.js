import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bevmekhubfwglalammkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldm1la2h1YmZ3Z2xhbGFtbWt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyNTY0OSwiZXhwIjoyMDgzMjAxNjQ5fQ.1mEs9uJ95BH9PUTOQeK9SUOeYYq4G4aZjocN8vvYums'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)