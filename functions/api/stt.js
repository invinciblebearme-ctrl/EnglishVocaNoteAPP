const MAX_BYTES = 400 * 1024
const DAY_MS = 86400000

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function allowedOrigin(origin) {
  if (!origin) return false
  try {
    const url = new URL(origin)
    if (url.origin !== origin) return false
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return true
    return url.protocol === 'https:' && !url.port && (
      url.hostname === 'note.allforedu.kr' ||
      /^(?:[a-z0-9-]+\.)?english-voca-note-app\.pages\.dev$/.test(url.hostname)
    )
  } catch { return false }
}

function validWav(audio) {
  if (audio.length < 44) return false
  const view = new DataView(audio.buffer, audio.byteOffset, audio.byteLength)
  const tag = offset => String.fromCharCode(...audio.subarray(offset, offset + 4))
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE' || view.getUint32(4, true) !== audio.length - 8) return false
  let format = false, dataSize = null, offset = 12
  while (offset + 8 <= audio.length) {
    const name = tag(offset)
    const size = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (start + size > audio.length) return false
    if (name === 'fmt ') {
      if (format || size < 16 || view.getUint16(start, true) !== 1 ||
          view.getUint16(start + 2, true) !== 1 || view.getUint32(start + 4, true) !== 16000 ||
          view.getUint32(start + 8, true) !== 32000 || view.getUint16(start + 12, true) !== 2 ||
          view.getUint16(start + 14, true) !== 16) return false
      format = true
    } else if (name === 'data') {
      if (dataSize !== null) return false
      dataSize = size
    }
    offset = start + size + (size % 2)
  }
  return offset === audio.length && format && dataSize !== null && dataSize % 2 === 0 &&
    dataSize >= 32000 * 0.3 && dataSize <= 32000 * 5
}

async function withinUsageLimit(request, db) {
  if (!db) return true // Local development without D1.
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  const minute = now.toISOString().slice(0, 16)
  const ip = request.headers.get('CF-Connecting-IP') || 'local'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + day))
  const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
  const increment = bucket => db.prepare(
    'INSERT INTO voca_stt_usage (bucket, count) VALUES (?, 1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count'
  ).bind(bucket)
  // D1 batch is transactional; concurrent requests cannot lose increments.
  const results = await db.batch([increment(`ip:${hash}:${minute}`), increment(`day:${day}`)])
  if (Math.random() < 0.01) {
    const cutoff = new Date(now.getTime() - 2 * DAY_MS).toISOString().slice(0, 10)
    // The timestamp follows the hash for IP buckets, so compare the date explicitly.
    await db.prepare(`DELETE FROM voca_stt_usage
      WHERE (bucket LIKE 'ip:%' AND substr(bucket, 21, 10) < ?)
         OR (bucket LIKE 'day:%' AND substr(bucket, 5, 10) < ?)`).bind(cutoff, cutoff).run()
  }
  return results[0].results[0].count <= 40 && results[1].results[0].count <= 3000
}

export async function onRequestPost({ request, env }) {
  if (!allowedOrigin(request.headers.get('Origin'))) return json({ error: 'Forbidden' }, 403)
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'audio/wav') {
    return json({ error: 'WAV audio is required' }, 415)
  }
  if (!env.AI) return json({ error: 'Speech recognition is unavailable' }, 503)
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return json({ error: 'Audio is too large' }, 413)
  try {
    const reader = request.body?.getReader()
    if (!reader) return json({ error: 'Audio is required' }, 400)
    // One bounded buffer also bounds memory for requests split into tiny chunks.
    const buffer = new Uint8Array(MAX_BYTES)
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (size + value.byteLength > MAX_BYTES) {
          await reader.cancel()
          return json({ error: 'Audio is too large' }, 413)
        }
        buffer.set(value, size)
        size += value.byteLength
      }
    } finally { reader.releaseLock() }
    const audio = buffer.subarray(0, size)
    if (!validWav(audio)) return json({ error: 'Invalid WAV audio' }, 400)
    if (!await withinUsageLimit(request, env.DB)) return json({ error: 'busy' }, 429)
    let binary = ''
    for (let offset = 0; offset < size; offset += 0x8000) {
      binary += String.fromCharCode(...audio.subarray(offset, offset + 0x8000))
    }
    const result = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
      audio: btoa(binary), language: 'en', task: 'transcribe',
    })
    if (typeof result?.text !== 'string') throw new Error('Invalid speech recognition response')
    return json({ text: result.text.trim() })
  } catch (error) {
    console.error('Speech recognition failed:', error)
    return json({ error: 'Speech recognition failed' }, 500)
  }
}
