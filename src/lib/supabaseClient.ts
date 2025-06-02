// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // <–– URL aus deinen Vercel Env‐Vars
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // <–– Anon‐Key aus deinen Vercel Env‐Vars
);