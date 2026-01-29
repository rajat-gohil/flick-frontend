const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type ApiError = {
  status: number;
  body: unknown;
};

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("auth_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      body,
    };
    throw error;
  }

  return body;
}
