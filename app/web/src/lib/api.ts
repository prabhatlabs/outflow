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

export type AuthHandlers = {
  /** Attempts a token refresh. Rejects when the refresh fails. */
  refresh: () => Promise<void>
  /** Called when the refresh fails (session is really dead). */
  onExpired?: () => void
}

let authHandlers: AuthHandlers | null = null

export function setAuthHandlers(handlers: AuthHandlers | null) {
  authHandlers = handlers
}

/** Endpoints that must never trigger the refresh-on-401 interceptor. */
const NON_INTERCEPTED_PATHS = new Set([
  "/auth/refresh",
  "/auth/logout",
  "/auth/login/email",
  "/auth/login/google",
  "/auth/callback/email",
  "/auth/callback/google",
])

/**
 * Single-flight refresh: concurrent 401s await the same promise
 * so we issue at most one POST /auth/refresh per expiry window.
 */
let refreshPromise: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  if (authHandlers === null) return Promise.resolve(false)
  const handlers = authHandlers
  refreshPromise = (async () => {
    try {
      await handlers.refresh()
      return true
    } catch {
      handlers.onExpired?.()
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
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

  if (!response.ok) {
    if (
      response.status === 401 &&
      !retried &&
      authHandlers !== null &&
      !NON_INTERCEPTED_PATHS.has(path)
    ) {
      const refreshed = await tryRefresh()
      if (refreshed) {
        return request<T>(path, options, true)
      }
    }
    throw await toApiError(response)
  }

  const body = await parseBody(response)
  return (body?.data ?? null) as T
}

async function parseBody(
  response: Response,
): Promise<(ApiResponse<unknown> & ApiErrorBody) | null> {
  try {
    return (await response.json()) as ApiResponse<unknown> & ApiErrorBody
  } catch {
    return null
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await parseBody(response)
  return new ApiError(
    response.status,
    body?.error,
    body?.message ?? response.statusText,
  )
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