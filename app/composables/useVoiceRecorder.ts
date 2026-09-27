const TARGET_RATE = 16_000
const MAX_SECONDS = 120

/** Downsample float PCM to 16 kHz and wrap it as a 16-bit mono WAV (accepted by every speech API). */
function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const length = chunks.reduce((n, c) => n + c.length, 0)
  const input = new Float32Array(length)
  let offset = 0
  for (const c of chunks) {
    input.set(c, offset)
    offset += c.length
  }
  const ratio = inputRate / TARGET_RATE
  const outLength = Math.floor(input.length / ratio)
  const pcm = new DataView(new ArrayBuffer(44 + outLength * 2))
  const write = (o: number, s: string) => [...s].forEach((ch, i) => pcm.setUint8(o + i, ch.charCodeAt(0)))
  write(0, 'RIFF')
  pcm.setUint32(4, 36 + outLength * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  pcm.setUint32(16, 16, true)
  pcm.setUint16(20, 1, true)
  pcm.setUint16(22, 1, true)
  pcm.setUint32(24, TARGET_RATE, true)
  pcm.setUint32(28, TARGET_RATE * 2, true)
  pcm.setUint16(32, 2, true)
  pcm.setUint16(34, 16, true)
  write(36, 'data')
  pcm.setUint32(40, outLength * 2, true)
  for (let i = 0; i < outLength; i++) {
    // average the samples that fall into this output slot (simple low-pass while downsampling)
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]!
    const s = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
    pcm.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([pcm], { type: 'audio/wav' })
}

/** Microphone recorder producing a WAV blob, with a live input level for the UI. */
export function useVoiceRecorder() {
  const recording = ref(false)
  const level = ref(0)
  const seconds = ref(0)
  const supported = computed(() => import.meta.client && !!navigator.mediaDevices?.getUserMedia && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext))

  let ctx: AudioContext | null = null
  let stream: MediaStream | null = null
  let processor: ScriptProcessorNode | null = null
  let chunks: Float32Array[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let autoStop: (() => void) | null = null

  function cleanup() {
    processor?.disconnect()
    stream?.getTracks().forEach((t) => t.stop())
    ctx?.close().catch(() => undefined)
    if (timer) clearInterval(timer)
    processor = null
    stream = null
    ctx = null
    timer = null
    recording.value = false
    level.value = 0
  }

  /** Starts recording; `onLimit` is called if the maximum length is reached. */
  async function start(onLimit?: () => void) {
    if (recording.value) return
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    const source = ctx.createMediaStreamSource(stream)
    // ScriptProcessor is deprecated but still the most widely supported way to read raw PCM.
    processor = ctx.createScriptProcessor(4096, 1, 1)
    chunks = []
    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0)
      chunks.push(new Float32Array(data))
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!
      level.value = Math.min(1, Math.sqrt(sum / data.length) * 6)
    }
    source.connect(processor)
    processor.connect(ctx.destination)
    seconds.value = 0
    recording.value = true
    autoStop = onLimit ?? null
    timer = setInterval(() => {
      seconds.value++
      if (seconds.value >= MAX_SECONDS) autoStop?.()
    }, 1000)
  }

  /** Stops and returns the recording (null if it was too short to contain speech). */
  function stop(): Blob | null {
    if (!recording.value || !ctx) return null
    const rate = ctx.sampleRate
    const recorded = chunks
    const duration = recorded.reduce((n, c) => n + c.length, 0) / rate
    cleanup()
    chunks = []
    return duration < 0.6 ? null : encodeWav(recorded, rate)
  }

  function cancel() {
    cleanup()
    chunks = []
  }

  onBeforeUnmount(cancel)
  return { supported, recording, level, seconds, start, stop, cancel }
}
