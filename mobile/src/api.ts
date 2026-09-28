interface ApiResponse<T> {
  success: true
  data: T
}

export interface MobileUser {
  id: string
  fullName: string
  username: string
  role: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Calls the ERP's /api/mobile endpoints and unwraps the `{ success, data }` envelope. */
export async function mobileApi<T>(baseUrl: string, path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/mobile${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError("Serverga ulanib bo'lmadi. Manzil va internetni tekshiring.", 0)
  }
  const json = (await res.json().catch(() => null)) as (ApiResponse<T> & { message?: string }) | null
  if (!res.ok || !json) throw new ApiError(json?.message || `Server xatosi (${res.status})`, res.status)
  return json.data
}
