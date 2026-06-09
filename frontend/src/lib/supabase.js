import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env'

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())
