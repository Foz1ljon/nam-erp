import { defineStore } from 'pinia'
import type { ApiResponse, CounterpartyDto, ItemDto, LocationDto, UserDto } from '#shared/types/models'

/** Reference data (directories) shared by selects and forms. */
export const useRefsStore = defineStore('refs', () => {
  const items = shallowRef<ItemDto[]>([])
  const locations = shallowRef<LocationDto[]>([])
  const users = shallowRef<UserDto[]>([])
  const counterparties = shallowRef<CounterpartyDto[]>([])
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function load(force = false) {
    if (loaded.value && !force) return
    if (inflight) return inflight
    const requestFetch = useRequestFetch()
    inflight = Promise.all([
      requestFetch<ApiResponse<ItemDto[]>>('/api/items'),
      requestFetch<ApiResponse<LocationDto[]>>('/api/locations'),
      requestFetch<ApiResponse<UserDto[]>>('/api/users'),
      requestFetch<ApiResponse<CounterpartyDto[]>>('/api/counterparties'),
    ])
      .then(([i, l, u, c]) => {
        items.value = i.data
        locations.value = l.data
        users.value = u.data
        counterparties.value = c.data
        loaded.value = true
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  const itemById = computed(() => new Map(items.value.map((i) => [i._id, i])))
  const locationById = computed(() => new Map(locations.value.map((l) => [l._id, l])))
  const locationByCode = computed(() => new Map(locations.value.map((l) => [l.code, l])))

  function $reset() {
    items.value = []
    locations.value = []
    users.value = []
    counterparties.value = []
    loaded.value = false
  }

  return { items, locations, users, counterparties, loaded, load, itemById, locationById, locationByCode, $reset }
})
