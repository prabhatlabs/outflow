const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

type ApiResponse<T> = {
  message: string
  data: T
}

type ApiErrorBody = {
  error?: string
  message?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, code: string | undefined, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
    })
  } catch {
    throw new ApiError(0, "NetworkError", "Unable to reach the server")
  }

  let body: (ApiResponse<T> & ApiErrorBody) | null = null
  try {
    body = (await response.json()) as ApiResponse<T> & ApiErrorBody
  } catch {
    body = null
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error,
      body?.message ?? response.statusText,
    )
  }

  return (body?.data ?? null) as T
}

export const api = {
  get: <T>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, payload?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  put: <T>(path: string, payload?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  patch: <T>(path: string, payload?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  del: <T>(path: string, payload?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: "DELETE",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
}

export const getApiUrl = () => API_URL