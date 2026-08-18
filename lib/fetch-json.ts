/**
 * Reads a fetch Response that is *supposed* to carry JSON, without ever
 * letting a non-JSON body escape as a raw parse error.
 *
 * Every client fetch in this app used to call `await response.json()`
 * before checking `response.ok`, then toast the caught error's `.message`.
 * When the body wasn't JSON that message was the browser's own
 * `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` — shown to
 * listers verbatim, and useless to them. Three real ways a route here
 * answers with HTML rather than JSON:
 *
 *   1. The session expired. The proxy redirects an unauthenticated request
 *      to /login, and fetch follows that redirect transparently — so the
 *      Response is a 200 carrying the login page's HTML. `response.ok` is
 *      true, which is why the ok-check alone never caught this; only
 *      `redirected` does.
 *   2. The request body exceeded the host's limit (Vercel rejects >4.5 MB
 *      with its own HTML error page, before our handler — and therefore
 *      before the route's own 10 MB check — ever runs).
 *   3. The function crashed or timed out, producing the platform's HTML
 *      error page instead of a handler response.
 *
 * Each gets a message a lister can act on. The raw body is logged to the
 * console for whoever is actually debugging.
 */
export type JsonResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function readJsonResponse<T>(response: Response): Promise<JsonResult<T>> {
  if (response.redirected) {
    return { ok: false, message: "Your session expired. Sign in again and retry." };
  }

  const text = await response.text();

  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    console.error(`Non-JSON response from ${response.url} (${response.status}):`, text.slice(0, 500));
    return { ok: false, message: nonJsonMessage(response.status) };
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : nonJsonMessage(response.status);
    return { ok: false, message };
  }

  return { ok: true, data: payload as T };
}

function nonJsonMessage(status: number): string {
  if (status === 401 || status === 403) return "Your session expired. Sign in again and retry.";
  if (status === 413) return "That file is too large to upload. Use an image under 4 MB.";
  if (status === 504) return "The server took too long to respond. Try again.";
  return "The server returned an unexpected response. Try again, and tell an admin if it keeps happening.";
}
