/**
 * Backend connection settings and the single place where HTTP requests are made.
 *
 * - The backend base URL comes from VITE_API_BASE_URL (see .env.example). It is never hardcoded.
 * - When it is empty, the services use the demo data adapter instead, and the UI says so.
 * - Only services call requestJson; pages and components never call fetch directly.
 */

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export function getApiBaseUrl(): string {
  return configuredBaseUrl.trim().replace(/\/+$/, '');
}

export function isBackendConfigured(): boolean {
  return getApiBaseUrl() !== '';
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isBackendConfigured()) {
    throw new ApiError('No backend is configured. Set VITE_API_BASE_URL to connect the Navetra API.', 0);
  }
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new ApiError(`The Navetra API returned status ${response.status}.`, response.status);
  }
  return (await response.json()) as T;
}
