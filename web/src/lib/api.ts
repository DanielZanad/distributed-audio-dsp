const FALLBACK_API_URL = 'http://localhost:3000'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL?.trim() || FALLBACK_API_URL
).replace(/\/$/, '')

export class ApiError extends Error {
  public readonly status: number
  public readonly payload: unknown

  constructor(
    message: string,
    status: number,
    payload: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string
}

export async function apiRequest<T>(
  path: string,
  { body, token, headers, ...rest }: ApiRequestOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers)
  const hasBody = body !== undefined
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  if (!isFormData) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: hasBody ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
  })

  const contentType = response.headers.get('content-type') ?? ''
  let payload: unknown = null

  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null)
  } else {
    const textPayload = await response.text().catch(() => '')
    payload = textPayload.length > 0 ? textPayload : null
  }

  if (!response.ok) {
    const message = resolveApiErrorMessage(payload, response.status)
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

function resolveApiErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    if (Array.isArray(message)) {
      return message.join(', ')
    }
    if (typeof message === 'string') {
      return message
    }
  }

  if (status === 401) {
    return 'Unauthorized request. Please sign in again.'
  }

  return 'Unexpected API error'
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}
