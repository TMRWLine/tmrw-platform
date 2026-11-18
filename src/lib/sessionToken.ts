import { supabase } from './supabaseClient';

export async function currentAccessToken(signal: AbortSignal): Promise<string | null> {
  if (signal.aborted) return null;
  let onAbort: () => void = () => {};
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => {
        onAbort = () => resolve(null);
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
    return result?.data.session?.access_token ?? null;
  } catch {
    return null;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
