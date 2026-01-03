// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ubiiazlklbqyszdazdzf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaWlhemxrbGJxeXN6ZGF6ZHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY0NTIsImV4cCI6MjA2MDI5MjQ1Mn0.KvfmAtQMSJSG00BDtPTKa5U3yR6AidmLYRRhevlLUVI'

export const supabase = createClient(supabaseUrl, supabaseKey)