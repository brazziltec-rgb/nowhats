import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Criar cliente mock quando Supabase não estiver configurado
const createMockSupabaseClient = () => {
  const mockResponse = { data: [], error: null };
  const mockClient = {
    from: () => ({
      select: () => Promise.resolve(mockResponse),
      insert: () => Promise.resolve(mockResponse),
      update: () => Promise.resolve(mockResponse),
      delete: () => Promise.resolve(mockResponse),
      eq: () => Promise.resolve(mockResponse),
      single: () => Promise.resolve(mockResponse)
    })
  };
  return mockClient as any;
};

// Usar Supabase real se configurado, senão usar mock
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient();

// Flag para verificar se Supabase está disponível
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase não configurado. Usando backend local para todos os dados.');
}
