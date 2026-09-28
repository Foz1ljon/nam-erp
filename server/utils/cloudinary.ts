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
 * (cloudinary://key:secret@cloud), or NUXT_CLOUDINARY_KEY / CLOUDINARY_KEY as the API secret.
 */
function config(): CloudinaryConfig {
  const rc = useRuntimeConfig().cloudinary as Partial<CloudinaryConfig>
  const fromUrl = process.env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
  const cfg = {
    cloudName: rc.cloudName || fromUrl?.[3] || '',
    apiKey: rc.apiKey || fromUrl?.[1] || '',
    apiSecret: rc.apiSecret || fromUrl?.[2] || (process.env.NUXT_CLOUDINARY_KEY || process.env.CLOUDINARY_KEY)?.trim() || '',
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

/** Public id a call's recording must end up with (the folder is part of it). */
export function recordingPublicId(callId: string): string {
  return `${FOLDER}/${callId}`
}

/**
 * Signed form fields for uploading one recording straight to Cloudinary (audio lives under the
 * "video" resource type). The phone posts the file with these fields, so large recordings never pass
 * through our server (Vercel caps request bodies at 4.5 MB) and the API secret never leaves it.
 */
export function signedAudioUpload(callId: string) {
  const cfg = config()
  const params = {
    folder: FOLDER,
    overwrite: 'true',
    public_id: callId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: DELIVERY_TYPE,
  }
  return {
    url: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/video/upload`,
    fields: { ...params, api_key: cfg.apiKey, signature: sign(params, cfg.apiSecret) },
  }
}

export interface CloudinaryUploadResult {
  public_id: string
  version: number | string
  signature: string
  format: string
  bytes: number
  duration?: number
}

/** Cloudinary signs every upload response with sha1("public_id=…&version=…" + secret): proof the file is really there. */
export function verifiedUpload(res: CloudinaryUploadResult): UploadedAudio {
  const expected = sign({ public_id: res.public_id, version: String(res.version) }, config().apiSecret)
  if (res.signature !== expected) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: "Cloudinary javobi imzosi noto'g'ri" })
  }
  return { publicId: res.public_id, format: res.format, bytes: res.bytes, duration: Math.round(res.duration ?? 0) }
}

/** Uploads an audio file through the server (older app versions; small files only on Vercel). */
export async function uploadAudio(file: { data: Buffer; filename: string; type?: string }, callId: string): Promise<UploadedAudio> {
  const { url, fields } = signedAudioUpload(callId)
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  form.append('file', new Blob([new Uint8Array(file.data)], { type: file.type || 'application/octet-stream' }), file.filename)

  const res = await $fetch<CloudinaryUploadResult>(url, { method: 'POST', body: form }).catch((error: unknown) => {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: `Cloudinary: ${errorText(error)}` })
  })
  return verifiedUpload(res)
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
