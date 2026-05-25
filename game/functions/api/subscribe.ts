// Cloudflare Pages Function: email signup endpoint.
//
// Receives JSON `{ email: string }` from the landing-page form, validates,
// and stores it in the SUBSCRIBERS KV namespace keyed by email.
//
// To enable this, the Cloudflare Pages project needs a KV binding:
//   1. Cloudflare dashboard → Workers & Pages → KV → Create namespace
//      Name it 'blocked_subscribers' (or anything — bind it under the
//      name SUBSCRIBERS in step 2).
//   2. Workers & Pages → dumbcorporategames project → Settings →
//      Functions → KV namespace bindings → Add binding.
//      Variable name: SUBSCRIBERS
//      KV namespace: <select the namespace you created>
//   3. Save + redeploy.
//
// Without the binding, this function returns a 500 with a clear error
// message — the landing page form will show it inline.

interface Env {
  SUBSCRIBERS?: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return text('Invalid JSON.', 400)
  }

  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String((body as { email: unknown }).email ?? '').trim().toLowerCase()
      : ''

  if (!email || !isLikelyEmail(email)) {
    return text('Please enter a valid email.', 400)
  }
  if (email.length > 200) {
    return text('Email too long.', 400)
  }

  if (!env.SUBSCRIBERS) {
    // Binding not configured yet — fail loudly with a clear message so the
    // user sees this on the landing page and knows to add the KV binding.
    return text(
      'Signup is misconfigured. Bind a KV namespace as SUBSCRIBERS in Pages settings.',
      500
    )
  }

  try {
    // Key by email so duplicate signups are idempotent. Store ISO timestamp
    // and the request's client IP / user agent as the value, lightly
    // structured so we can audit later.
    const meta = {
      addedAt: new Date().toISOString(),
      ua: request.headers.get('user-agent') ?? '',
      country: request.headers.get('cf-ipcountry') ?? '',
    }
    await env.SUBSCRIBERS.put(email, JSON.stringify(meta))
  } catch (err) {
    return text(
      `Storage error: ${err instanceof Error ? err.message : 'unknown'}`,
      500
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Block other HTTP methods so this endpoint is POST-only.
export const onRequest: PagesFunction<Env> = async () =>
  text('POST only.', 405)

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

// Permissive RFC-5322 light regex. We don't deliverability-check here;
// just sanity-filter typos and gibberish before storage.
function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}
