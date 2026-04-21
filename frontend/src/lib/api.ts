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
    const message = payload.error ?? `Request failed with status ${response.status}`;
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
