import type { StockDto } from '#shared/types/models'

/** Current balances of a location as `{ [itemId]: qty }`, refreshed whenever the location changes. */
export function useLocationStock(location: MaybeRefOrGetter<string | null | undefined>) {
  const map = ref<Record<string, number>>({})
  const loading = ref(false)

  async function refresh() {
    const id = toValue(location)
    if (!id) {
      map.value = {}
      return
    }
    loading.value = true
    try {
      const res = await $fetch<{ data: StockDto[] }>('/api/stock', { query: { location: id } })
      map.value = Object.fromEntries(res.data.map((s) => [s.item._id, s.qty]))
    } finally {
      loading.value = false
    }
  }

  watch(() => toValue(location), refresh, { immediate: import.meta.client })
  return { stock: map, loading, refresh }
}
