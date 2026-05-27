import { createBrowserClient } from "@supabase/ssr";

import {
  getSupabaseConfig,
} from "@/utils/supabase/config";

export const createClient = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return createBrowserClient(supabaseUrl, supabaseKey);
};
