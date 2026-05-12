import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente Supabase usando variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
