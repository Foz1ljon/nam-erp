import mongoose from 'mongoose'
import { seedDatabase } from '../utils/seed'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  mongoose.set('strictQuery', true)

  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 })
      console.info('[mongo] connected')
    } catch (error) {
      console.error('[mongo] connection failed', error)
      return
    }
  }

  try {
    await seedDatabase({ demo: config.seedDemo })
  } catch (error) {
    console.error('[seed] failed', error)
  }
})
