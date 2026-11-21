const SAMPLE_RATE = 16000
const FALLBACK_ERRORS = new Set(['network', 'service-not-allowed', 'language-not-supported', 'audio-capture', 'timeout'])

function speechError(code, message = code) {
  return Object.assign(new Error(message), { code })
}

function rememberServer() {
  try { localStorage.setItem('stt_mode', 'server') } catch { /* Storage may be disabled. */ }
}

function prefersServer() {
  try { return localStorage.getItem('stt_mode') === 'server' } catch { return false }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw speechError('aborted')
}

// Keep observing the original promise even after cancellation (permission dialogs
// cannot be aborted); callers dispose of resources that arrive late.
function abortable(promise, signal) {
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => reject(speechError('aborted'))
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

async function recordingDelay(signal) {
  let timer
  try { await abortable(new Promise(resolve => { timer = setTimeout(resolve, 3500) }), signal) }
  finally { clearTimeout(timer) }
}

function webSpeech(Recognition, lang, onState, signal) {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal)
    const recognition = new Recognition()
    let settled = false
    let timer
    const abort = () => finish(speechError('aborted'))
    const finish = (error, text) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onspeechend = recognition.onend = null
      try { recognition.abort() } catch { /* Already stopped. */ }
      if (error) reject(error)
      else resolve(text)
    }
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      clearTimeout(timer)
      timer = setTimeout(() => finish(speechError('timeout')), 8000)
      onState?.('listening', 8000)
    }
    recognition.onspeechend = () => onState?.('processing')
    recognition.onresult = event => {
      const text = event.results?.[0]?.[0]?.transcript?.trim()
      if (text) finish(null, text)
      else finish(speechError('no-speech'))
    }
    recognition.onerror = event => finish(speechError(event.error))
    // Also cover implementations that end without a result or error.
    timer = setTimeout(() => finish(speechError('timeout')), 8000)
    signal?.addEventListener('abort', abort, { once: true })
    try { recognition.start() } catch (error) {
      finish(speechError(error.name === 'NotAllowedError' ? 'not-allowed' : 'service-not-allowed'))
    }
  })
}

// Input is mono PCM already resampled to 16 kHz.
export function encodeWav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true)
  }
  return buffer
}

async function recordWav(onState, signal) {
  throwIfAborted(signal)
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext
  if (!navigator.mediaDevices?.getUserMedia || !AudioContext || !OfflineAudioContext) {
    throw speechError('audio-capture')
  }
  let context, stream, source, processor, mute
  const chunks = []
  let length = 0
  try {
    // Create/resume synchronously in the button gesture, including on iOS.
    context = new AudioContext()
    const ready = context.resume()
    ready.catch(() => {})
    const permission = navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1,
    } }).then(value => {
      if (signal?.aborted) {
        value.getTracks().forEach(track => track.stop())
        throw speechError('aborted')
      }
      stream = value
      return value
    })
    stream = await abortable(permission, signal)
    await abortable(ready, signal)
    throwIfAborted(signal)
    source = context.createMediaStreamSource(stream)
    processor = context.createScriptProcessor(4096, 1, 1)
    mute = context.createGain()
    mute.gain.value = 0
    processor.onaudioprocess = event => {
      const remaining = Math.floor(context.sampleRate * 3.5) - length
      if (remaining <= 0) return
      const samples = new Float32Array(event.inputBuffer.getChannelData(0).subarray(0, remaining))
      chunks.push(samples)
      length += samples.length
    }
    source.connect(processor)
    processor.connect(mute)
    mute.connect(context.destination)
    onState?.('listening', 3500)
    await recordingDelay(signal)
  } catch (error) {
    if (signal?.aborted || error.code === 'aborted') throw speechError('aborted')
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' || error.name === 'SecurityError') {
      throw speechError('not-allowed')
    }
    throw speechError('audio-capture')
  } finally {
    stream?.getTracks().forEach(track => track.stop())
    if (processor) processor.onaudioprocess = null
    source?.disconnect()
    processor?.disconnect()
    mute?.disconnect()
    if (context) await context.close().catch(() => {})
  }
  throwIfAborted(signal)
  onState?.('processing')
  if (!length) throw speechError('no-speech')
  const pcm = new Float32Array(length)
  let offset = 0
  for (const chunk of chunks) { pcm.set(chunk, offset); offset += chunk.length }
  const offline = new OfflineAudioContext(1, Math.ceil(length * SAMPLE_RATE / context.sampleRate), SAMPLE_RATE)
  const input = offline.createBuffer(1, length, context.sampleRate)
  input.copyToChannel(pcm, 0)
  const playback = offline.createBufferSource()
  playback.buffer = input
  playback.connect(offline.destination)
  playback.start()
  try {
    const rendered = await abortable(offline.startRendering(), signal)
    throwIfAborted(signal)
    return encodeWav(rendered.getChannelData(0))
  } finally {
    try { playback.stop() } catch { /* Already rendered. */ }
    playback.disconnect()
    playback.buffer = null
  }
}

async function serverSpeech(onState, signal) {
  const wav = await recordWav(onState, signal)
  throwIfAborted(signal)
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 12000)
  try {
    const response = await fetch('/api/stt', {
      method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: wav, signal: controller.signal,
    })
    throwIfAborted(signal)
    if (response.status === 429) throw speechError('busy')
    if (!response.ok) throw speechError('server')
    const result = await response.json()
    throwIfAborted(signal)
    if (typeof result.text !== 'string') throw speechError('server')
    const text = result.text.trim()
    if (!text) throw speechError('no-speech')
    return text
  } catch (error) {
    if (signal?.aborted) throw speechError('aborted')
    if (error.code === 'no-speech' || error.code === 'busy') throw error
    throw speechError('server')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

export async function recognizeSpeech({ lang = 'en-US', onState, signal } = {}) {
  throwIfAborted(signal)
  onState?.('preparing')
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const chrome = /Chrome/.test(navigator.userAgent)
    && !/Edg\/|Whale\/|OPR\/|SamsungBrowser/.test(navigator.userAgent)
    && navigator.vendor === 'Google Inc.'
  if (chrome && Recognition && !prefersServer()) {
    try { return await webSpeech(Recognition, lang, onState, signal) } catch (error) {
      throwIfAborted(signal)
      if (!FALLBACK_ERRORS.has(error.code)) throw error
      // An asynchronous recognition failure may have lost the user gesture.
      // Prepare the server route for the next button press instead of resuming
      // a new AudioContext outside that gesture.
      rememberServer()
      throw speechError('retry')
    }
  }
  rememberServer()
  return serverSpeech(onState, signal)
}
