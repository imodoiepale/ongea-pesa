/**
 * Fetch JSON and fail with a message that names the actual problem.
 *
 * The pattern this replaces was everywhere in the app:
 *
 *     const json = await res.json()
 *     if (!res.ok) throw new Error(json.error || "Something went wrong")
 *
 * That parses the body BEFORE checking the status. When a route returns an HTML
 * error page — a stale deploy serving 404, a 500 from an unhandled throw, an
 * auth redirect — `res.json()` throws `SyntaxError: Unexpected token '<'`, the
 * catch block reports that, and the real cause is invisible. The user sees a
 * cryptic parser error for what is actually a deploy or auth problem.
 *
 * So: read the body as text, then decide. A non-JSON response gets a message
 * that says what actually happened.
 */
export async function fetchJson<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    // Network-level failure: offline, DNS, CORS, connection reset.
    throw new Error("Could not reach the server. Check your connection and try again.")
  }

  const raw = await res.text()

  let parsed: unknown = null
  let isJson = false
  if (raw) {
    try {
      parsed = JSON.parse(raw)
      isJson = true
    } catch {
      isJson = false
    }
  }

  if (!res.ok) {
    if (isJson) {
      const body = parsed as { error?: unknown; message?: unknown }
      const message =
        typeof body?.error === "string"
          ? body.error
          : typeof body?.message === "string"
            ? body.message
            : `Request failed (${res.status})`
      throw new Error(message)
    }

    // Non-JSON error body. Name the likely cause rather than leaking HTML.
    if (res.status === 404) {
      throw new Error(
        `That feature is not available on this deployment yet (404 at ${input}). If it was just released, the app may still be redeploying.`,
      )
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Your session has expired. Please sign in again.")
    }
    throw new Error(`Server error (${res.status}). Please try again.`)
  }

  if (!isJson) {
    throw new Error(
      `The server returned an unexpected response from ${input}. The app may need to be redeployed.`,
    )
  }

  return parsed as T
}
