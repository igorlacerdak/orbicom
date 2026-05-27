const SUPABASE_FETCH_TIMEOUT_MS = 5000;

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const assertSupabaseConfig = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no ambiente.",
    );
  }
};

export const getSupabaseConfig = () => {
  assertSupabaseConfig();

  return {
    supabaseUrl: supabaseUrl as string,
    supabaseKey: supabaseKey as string,
  };
};

export const getSupabaseUnavailableMessage = () =>
  "Nao foi possivel conectar ao Supabase. Verifique se o projeto esta ativo e se a URL do projeto esta correta.";

export const createSupabaseFetch =
  (timeoutMs = SUPABASE_FETCH_TIMEOUT_MS): typeof fetch =>
  async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
