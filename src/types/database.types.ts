// src/types/database.types.ts

// Import the generated `Database` type from the CLI
import { type Database as SupabaseDatabase } from './supabase.types'

// This is our new, globally available type for the database.
// We will use this in our Supabase client helpers.
// It correctly includes Tables, Enums, and Functions (RPCs).
export type Database = SupabaseDatabase

// You can still define global helper types for easier access
declare global {
  type Tables<T extends keyof SupabaseDatabase['public']['Tables']> =
    SupabaseDatabase['public']['Tables'][T]['Row']
  type Enums<T extends keyof SupabaseDatabase['public']['Enums']> =
    SupabaseDatabase['public']['Enums'][T]
}
