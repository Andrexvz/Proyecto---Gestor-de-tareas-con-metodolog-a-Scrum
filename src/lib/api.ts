const TOKEN_KEY = 'agile_velocity_jwt';

let onUnauthorizedHandler: ((message?: string) => void) | null = null;

export function setOnUnauthorized(handler: (message?: string) => void) {
  onUnauthorizedHandler = handler;
}

export function getStoredToken(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
  } catch {}
  return null;
}

export function setStoredToken(token: string | null) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  } catch {}
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
  : '';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { signal?: AbortSignal; skipAuthRedirect?: boolean } = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !options.skipAuthRedirect) {
      setStoredToken(null);
      onUnauthorizedHandler?.(
        data?.error || 'Tu sesión ha expirado. Por favor, ingresa nuevamente'
      );
    }
    throw new ApiError(data?.error || 'Error inesperado en el servidor', response.status);
  }

  return data as T;
}
