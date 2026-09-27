import type { ApiResponse } from '#shared/types/models'

type Query = Record<string, string | number | boolean | null | undefined | string[]>

function cleanQuery(query: Query | undefined): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = {}
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== null && v !== undefined && v !== '') out[k] = v
  }
  return out
}

/**
 * SSR-safe GET that unwraps the `{ success, data }` envelope. The key follows the URL and query.
 * A `null` URL skips the request and yields the default value.
 */
export function useApiData<T>(
  url: MaybeRefOrGetter<string | null>,
  options: { query?: MaybeRefOrGetter<Query | undefined>; default: () => T; lazy?: boolean },
) {
  const requestFetch = useRequestFetch()
  const params = computed(() => cleanQuery(toValue(options.query)))
  const key = computed(() => `api:${toValue(url)}?${JSON.stringify(params.value)}`)

  return useAsyncData<T>(
    key,
    async () => {
      const target = toValue(url)
      if (!target) return options.default()
      return (await requestFetch<ApiResponse<T>>(target, { query: params.value })).data
    },
    { default: options.default, lazy: options.lazy },
  )
}

export function errorMessage(error: unknown): string {
  const e = error as { data?: { message?: string; statusMessage?: string }; message?: string }
  return e?.data?.message || e?.data?.statusMessage || e?.message || "Noma'lum xatolik"
}

/** Mutations with toast feedback. Returns `null` when the request failed (the error is shown). */
export function useApiAction() {
  const message = useMessage()
  const pending = ref(false)

  async function run<T>(
    url: string,
    options: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; success?: string },
  ): Promise<T | null> {
    pending.value = true
    try {
      const res = await $fetch<ApiResponse<T>>(url, { method: options.method, body: options.body as Record<string, unknown> })
      if (options.success) message.success(options.success)
      return res.data
    } catch (error) {
      message.error(errorMessage(error), { duration: 6000 })
      return null
    } finally {
      pending.value = false
    }
  }

  return { run, pending }
}
