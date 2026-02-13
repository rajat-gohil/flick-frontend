const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

  // Read response safely (handles empty bodies)
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    // Throw a structured object without custom types
    throw {
      status: response.status,
      data,
    };
  }

  return data;
}

export const getStreamingProviders = async (movieId: number) => {
  const response = await fetch(`/api/movies/${movieId}/streaming/`);
  return response.json();
};