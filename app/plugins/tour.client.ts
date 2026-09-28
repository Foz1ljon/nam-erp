/** A tour belongs to one page: leaving the page (link, back button) closes it and its overlay. */
export default defineNuxtPlugin(() => {
  useRouter().beforeEach((to, from) => {
    if (to.path !== from.path) stopTour()
  })
})
