const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

// These are wired up once from store.ts after the store is created
let getAccessToken: () => string | null = () => null;
let refreshAccessToken: () => Promise<boolean> = async () => false;

export function configureApiClient(opts: {
  getToken: () => string | null;
  refresh: () => Promise<boolean>;
}) {
  getAccessToken = opts.getToken;
  refreshAccessToken = opts.refresh;
}

function httpErrorMessage(status: number): string {
  switch (status) {
    case 400: return "The request was invalid. Please check your input and try again.";
    case 401: return "Your session has expired. Please log in again.";
    case 403: return "You do not have permission to perform this action.";
    case 404: return "The requested resource was not found.";
    case 409: return "This action conflicts with existing data. Please refresh and try again.";
    case 422: return "The submitted data could not be processed. Please check your input.";
    case 429: return "Too many requests. Please wait a moment and try again.";
    case 500: return "A server error occurred. Please try again later.";
    case 503: return "The service is temporarily unavailable. Please try again later.";
    default:  return "Something went wrong. Please try again.";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: "include",
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch();

  // If access token expired, try a silent refresh then retry once
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    const message = payload.error ?? httpErrorMessage(response.status);
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

import type { AuditLog } from "@/lib/types";
export const getAuditLogs = (limit = 200) =>
  api.get<AuditLog[]>(`/api/audit-logs?limit=${limit}`);
