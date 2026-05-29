/** Typed fetch client. Works in RSC (absolute URL) and browser (same-origin /api proxy). */
import { ApiResponse } from '@/types';

const SERVER_BASE = process.env.API_PROXY_URL || 'http://localhost:4001';

function baseUrl(): string {
  // In the browser, hit the Next.js /api rewrite so cookies are same-origin.
  return typeof window === 'undefined' ? `${SERVER_BASE}/api/v1` : '/api/v1';
}

export interface ApiError extends Error {
  code: string;
  field?: string;
  status: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { country?: string } = {},
): Promise<ApiResponse<T>> {
  const { country, headers, ...rest } = options;
  const url = new URL(`${baseUrl()}${path}`, typeof window === 'undefined' ? SERVER_BASE : window.location.origin);
  if (country) url.searchParams.set('country', country);

  const res = await fetch(url.toString(), {
    ...rest,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    // RSC catalog calls can be cached briefly; mutations are POST and not cached.
    cache: rest.method && rest.method !== 'GET' ? 'no-store' : (rest.cache ?? 'no-store'),
  });

  const json = (await res.json().catch(() => ({ success: false, error: { code: 'PARSE_ERROR', message: 'Invalid response' } }))) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? 'Request failed') as ApiError;
    err.code = json.error?.code ?? 'ERROR';
    err.field = json.error?.field;
    err.status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  get: <T>(path: string, opts?: { country?: string }) => request<T>(path, { method: 'GET', ...opts }),
  post: <T>(path: string, body?: unknown, opts?: { country?: string }) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts }),
  put: <T>(path: string, body?: unknown, opts?: { country?: string }) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...opts }),
  del: <T>(path: string, opts?: { country?: string }) => request<T>(path, { method: 'DELETE', ...opts }),
};
