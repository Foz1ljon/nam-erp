/**
 * The introduction was closed in this tab. The server flag (POST /api/auth/onboarded) can lag on a cold
 * serverless start; this state lets the user leave the intro at once. Reset on sign-in/sign-out so the
 * intro opens again after the next login.
 */
export function useIntroDismissed() {
  return useState('nm:intro-dismissed', () => false)
}
