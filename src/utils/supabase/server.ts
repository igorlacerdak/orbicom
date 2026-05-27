import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  createSupabaseFetch,
  getSupabaseConfig,
} from "@/utils/supabase/config";

export const createClient = async () => {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: createSupabaseFetch(),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Ignorado em Server Components quando cookie write nao e permitido.
        }
      },
    },
  });
};
