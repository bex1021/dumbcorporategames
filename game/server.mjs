// Production server for Tokay: serves the Vite build in dist/ and the
// /api/subscribe signup endpoint (the Tokay replacement for the Cloudflare
// Pages Function in functions/api/subscribe.ts). No dependencies.
//
// Signups are stored in $TOKAY_DATA_DIR/subscribers.json, keyed by email,
// which survives deploys and restarts.

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, rename, stat, writeFile, mkdir } from 'node:fs/promises'
import { createGzip } from 'node:zlib'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const DATA_DIR = process.env.TOKAY_DATA_DIR || resolve('data')
const SUBSCRIBERS = join(DATA_DIR, 'subscribers.json')
const PORT = Number(process.env.PORT) || 3000

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.hdr': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.gltf', '.txt', '.xml'])

function text(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(body)
}

// Permissive RFC-5322 light regex, same as the Pages Function.
function isLikelyEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// Serialize writes so concurrent signups can't clobber each other.
let writeChain = Promise.resolve()

async function addSubscriber(email, meta) {
  writeChain = writeChain.then(async () => {
    await mkdir(DATA_DIR, { recursive: true })
    let all = {}
    try {
      all = JSON.parse(await readFile(SUBSCRIBERS, 'utf8'))
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    all[email] = all[email] ?? meta // idempotent: keep the first signup time
    const tmp = `${SUBSCRIBERS}.tmp`
    await writeFile(tmp, JSON.stringify(all, null, 2))
    await rename(tmp, SUBSCRIBERS)
  })
  return writeChain
}

async function readBody(req, limit = 10_000) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > limit) throw new Error('too large')
  }
  return body
}

async function handleSubscribe(req, res) {
  if (req.method !== 'POST') return text(res, 405, 'POST only.')
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    return text(res, 400, 'Invalid JSON.')
  }
  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String(body.email ?? '').trim().toLowerCase()
      : ''
  if (!email || !isLikelyEmail(email)) return text(res, 400, 'Please enter a valid email.')
  if (email.length > 200) return text(res, 400, 'Email too long.')
  try {
    await addSubscriber(email, {
      addedAt: new Date().toISOString(),
      ua: req.headers['user-agent'] ?? '',
    })
  } catch (err) {
    return text(res, 500, `Storage error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))
}

async function serveFile(req, res, file, status = 200) {
  const ext = extname(file).toLowerCase()
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    // Vite fingerprints everything under /assets/, so those never change.
    'Cache-Control': file.startsWith(join(DIST, 'assets')) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
  }
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  if (gzip) {
    headers['Content-Encoding'] = 'gzip'
    headers['Vary'] = 'Accept-Encoding'
  } else {
    headers['Content-Length'] = (await stat(file)).size
  }
  res.writeHead(status, headers)
  if (req.method === 'HEAD') return res.end()
  const stream = createReadStream(file)
  ;(gzip ? stream.pipe(createGzip()) : stream).pipe(res)
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname === '/api/subscribe') return await handleSubscribe(req, res)
    if (req.method !== 'GET' && req.method !== 'HEAD') return text(res, 405, 'Method not allowed.')

    const target = normalize(join(DIST, decodeURIComponent(pathname)))
    if (!target.startsWith(DIST)) return text(res, 400, 'Bad path.')
    if (await isFile(target)) return await serveFile(req, res, target)
    if (await isFile(join(target, 'index.html'))) return await serveFile(req, res, join(target, 'index.html'))
    // SPA fallback (was public/_redirects on Cloudflare): let React Router
    // handle deep links like /blocked.
    return await serveFile(req, res, join(DIST, 'index.html'))
  } catch (err) {
    console.error(err)
    if (!res.headersSent) text(res, 500, 'Server error.')
    else res.end()
  }
}).listen(PORT, () => console.log(`serving ${DIST} on :${PORT}, signups -> ${SUBSCRIBERS}`))
