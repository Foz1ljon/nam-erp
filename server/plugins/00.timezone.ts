// The factory runs on Tashkent time (UTC+5). Vercel functions run in UTC, which made server-rendered
// dates (tables, date pickers) differ from the browser and broke hydration. Node applies a runtime
// change of process.env.TZ to every Date created afterwards, so set it before anything renders.
export default defineNitroPlugin(() => {
  process.env.TZ = 'Asia/Tashkent'
})
