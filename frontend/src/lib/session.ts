// 401 session-expired handling.
// AuthContext listens for the event below and clears the stale token + notifies the user.

const SESSION_EXPIRED_EVENT = 'fv:session-expired'

/**
 * Call on a failed (non-ok) response of a token-bearing request.
 * Returns true when the failure was a 401 (session expired).
 */
export function handleSessionExpired(response: Response): boolean {
  if (response.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    return true
  }
  return false
}

/** Register a listener; returns the unsubscribe function. */
export function onSessionExpired(handler: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler)
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
}
