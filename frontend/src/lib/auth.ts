type SupabaseConfig = { supabase_url: string; publishable_key: string };
type AuthSession = { access_token: string; refresh_token: string; expires_at: number };
type AuthResponse = { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number; msg?: string; message?: string; error_description?: string };

const SESSION_KEY = 'omimind.auth.session';
const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
let configPromise: Promise<SupabaseConfig> | undefined;
let session: AuthSession | null = readSession();
let refreshPromise: Promise<string | null> | null = null;

function readSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const value = JSON.parse(stored) as AuthSession;
    return value.access_token && value.refresh_token ? value : null;
  } catch {
    return null;
  }
}

function storeSession(value: AuthResponse): AuthSession | null {
  if (!value.access_token || !value.refresh_token) return null;
  const next = {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_at: value.expires_at ?? Math.floor(Date.now() / 1000) + (value.expires_in ?? 3600),
  };
  session = next;
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export function clearSession(): void {
  session = null;
  refreshPromise = null;
  localStorage.removeItem(SESSION_KEY);
}

async function getConfig(): Promise<SupabaseConfig> {
  configPromise ??= fetch(`${apiBase}/api/auth/config`).then(async (response) => {
    if (!response.ok) throw new Error('Could not load sign-in configuration.');
    const config = await response.json() as SupabaseConfig;
    if (!config.supabase_url || !config.publishable_key) {
      throw new Error('Sign-in is not configured on this deployment.');
    }
    return config;
  }).catch((error) => {
    configPromise = undefined;
    throw error;
  });
  return configPromise;
}

async function authRequest(path: string, body: Record<string, string>): Promise<AuthResponse> {
  const config = await getConfig();
  const response = await fetch(`${config.supabase_url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.publishable_key },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as AuthResponse;
  if (!response.ok) {
    throw new Error(result.msg ?? result.message ?? result.error_description ?? 'Sign-in failed. Check your email and password.');
  }
  return result;
}

export async function signIn(email: string, password: string): Promise<void> {
  const result = await authRequest('token?grant_type=password', { email, password });
  if (!storeSession(result)) throw new Error('Supabase did not return an active session.');
}

export async function signUp(email: string, password: string): Promise<void> {
  const result = await authRequest('signup', { email, password });
  // Supabase may return a session when email confirmation is disabled. End it
  // immediately so signup always leads to an explicit sign-in step.
  if (result.access_token) {
    const config = await getConfig();
    await fetch(`${config.supabase_url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: config.publishable_key,
        Authorization: `Bearer ${result.access_token}`,
      },
    }).catch(() => undefined);
  }
  clearSession();
}

export async function signOut(): Promise<void> {
  if (session?.access_token) {
    try {
      const config = await getConfig();
      await fetch(`${config.supabase_url}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: config.publishable_key, Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      // Local credentials are still cleared when the auth service is unavailable.
    }
  }
  clearSession();
}

export async function getAccessToken(): Promise<string | null> {
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 45) return session.access_token;
  if (!refreshPromise) {
    const refreshToken = session.refresh_token;
    refreshPromise = (async () => {
      try {
        const result = await authRequest('token?grant_type=refresh_token', { refresh_token: refreshToken });
        if (session?.refresh_token !== refreshToken) return null;
        return storeSession(result)?.access_token ?? null;
      } catch {
        if (session?.refresh_token === refreshToken) clearSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}
