import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Shared Axios instance for all backend calls. */
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
})

// ── Request interceptor: attach content-type for JSON requests ─────────────
apiClient.interceptors.request.use((config) => {
  if (config.data && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

// ── Response interceptor: normalise error messages ─────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message: string =
      error?.response?.data?.message ??
      error?.message ??
      'Unknown network error'
    return Promise.reject(new Error(message))
  }
)
