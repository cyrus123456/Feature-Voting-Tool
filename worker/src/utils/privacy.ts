/**
 * Privacy helper for SSO synthetic emails.
 *
 * SSO auto-login creates users with a synthetic email `sso-<externalUserId>@sso.local`.
 * The `<externalUserId>` is the caller's own user id — exposing it in any API response
 * (comments are public to all visitors) would leak it. This helper replaces the synthetic
 * email with a stable pseudonym derived from the internal user UUID, which never contains
 * the external id. Real (magic-link) emails are returned unchanged.
 *
 * The DB storage is untouched; sanitization happens only at the response boundary.
 */
const SYNTHETIC_SSO = /^sso-.+@sso\.local$/

export function sanitizeEmail(
  email: string | null | undefined,
  userId: string,
): string | undefined {
  if (!email) return email ?? undefined
  if (SYNTHETIC_SSO.test(email)) {
    return `user-${userId.replace(/-/g, "").slice(0, 8)}@sso.local`
  }
  return email
}
