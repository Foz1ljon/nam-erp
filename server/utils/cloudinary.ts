import { createHash } from 'node:crypto'

interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export interface UploadedAudio {
  publicId: string
  format: string
  bytes: number
  duration: number
}

/** Call recordings are private: stored as "authenticated" assets, served only through signed links. */
const DELIVERY_TYPE = 'authenticated'
const FOLDER = 'nam-erp/calls'

/**
 * Credentials come from NUXT_CLOUDINARY_* (runtimeConfig), the standard CLOUDINARY_URL
 * (cloudinary://key:secret@cloud), or CLOUDINARY_KEY as the API secret.
 */
function config(): CloudinaryConfig {
  const rc = useRuntimeConfig().cloudinary as Partial<CloudinaryConfig>
  const fromUrl = process.env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
  const cfg = {
    cloudName: rc.cloudName || fromUrl?.[3] || '',
    apiKey: rc.apiKey || fromUrl?.[1] || '',
    apiSecret: rc.apiSecret || fromUrl?.[2] || process.env.CLOUDINARY_KEY?.trim() || '',
  }
  if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Cloudinary sozlanmagan: NUXT_CLOUDINARY_CLOUD_NAME, NUXT_CLOUDINARY_API_KEY va CLOUDINARY_KEY kerak',
    })
  }
  return cfg
}

/** Cloudinary API signature: sha1 of the sorted "key=value&..." params followed by the API secret. */
function sign(params: Record<string, string>, secret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(payload + secret).digest('hex')
}

/** Uploads an audio file (Cloudinary keeps audio under the "video" resource type). */
export async function uploadAudio(file: { data: Buffer; filename: string; type?: string }, publicId: string): Promise<UploadedAudio> {
  const cfg = config()
  const params = {
    folder: FOLDER,
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: DELIVERY_TYPE,
  }
  const form = new FormData()
  for (const [k, v] of Object.entries(params)) form.append(k, v)
  form.append('api_key', cfg.apiKey)
  form.append('signature', sign(params, cfg.apiSecret))
  form.append('file', new Blob([new Uint8Array(file.data)], { type: file.type || 'application/octet-stream' }), file.filename)

  const res = await $fetch<{ public_id: string; format: string; bytes: number; duration?: number }>(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/video/upload`,
    { method: 'POST', body: form },
  ).catch((error: unknown) => {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: `Cloudinary: ${errorText(error)}` })
  })
  return { publicId: res.public_id, format: res.format, bytes: res.bytes, duration: Math.round(res.duration ?? 0) }
}

/** Short-lived signed link to a private recording (Cloudinary "download" API). */
export function audioDownloadUrl(audio: { publicId: string; format: string }, ttlSeconds = 3600): string {
  const cfg = config()
  const timestamp = Math.floor(Date.now() / 1000)
  const params = {
    expires_at: String(timestamp + ttlSeconds),
    format: audio.format,
    public_id: audio.publicId,
    timestamp: String(timestamp),
    type: DELIVERY_TYPE,
  }
  const query = new URLSearchParams({ ...params, api_key: cfg.apiKey, signature: sign(params, cfg.apiSecret) })
  return `https://api.cloudinary.com/v1_1/${cfg.cloudName}/video/download?${query}`
}
