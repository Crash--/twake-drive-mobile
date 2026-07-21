import { TwakeConfiguration } from './types'

export const extractDomain = (email: string): string | null => {
  if (!email) return null
  const trimmed = email.trim()
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex === -1) return null
  const domain = trimmed.substring(atIndex + 1)
  return domain.length > 0 ? domain : null
}

export const fetchTwakeConfiguration = async (
  domain: string
): Promise<TwakeConfiguration | null> => {
  const url = `https://${domain}/.well-known/twake-configuration`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    })
    if (!response.ok) return null
    return (await response.json()) as TwakeConfiguration
  } catch {
    return null
  }
}

const REDIRECT_SCHEME = 'cozy://'

// Twake Workplace sign-up / sign-in (the consumer flow) goes straight to this
// fixed URL — no .well-known/twake-configuration lookup (that's only for an
// organization's own server, discovered from the email domain).
export const TWAKE_WORKPLACE_LOGIN_URL = 'https://sign-up.twake.app'

const buildLoginUri = (flagshipUri: string, extra?: Record<string, string>): URL | null => {
  try {
    const uri = new URL(flagshipUri)
    uri.searchParams.append('redirect_after_oidc', REDIRECT_SCHEME)
    for (const [key, value] of Object.entries(extra ?? {})) uri.searchParams.append(key, value)
    return uri
  } catch {
    return null
  }
}

export const getLoginUri = async (email: string): Promise<URL | null> => {
  const domain = extractDomain(email)
  if (!domain) return null

  const config = await fetchTwakeConfiguration(domain)
  const flagshipUri = config?.['twake-flagship-login-uri']
  return flagshipUri ? buildLoginUri(flagshipUri) : null
}

// Twake Workplace (sign-up.twake.app) picks its entry screen from its own intent
// params: `login` → login screen, `register` → register screen; neither → the
// landing/home page. It ignores `redirect_after_oidc`, so without an intent param
// sign-in lands on the home page instead of the login form. The token still comes
// back through our own `redirect_after_oidc=cozy://` deep-link, untouched here.
export const getTwakeWorkplaceLoginUri = (mode: 'signin' | 'signup'): URL => {
  const uri = new URL(TWAKE_WORKPLACE_LOGIN_URL)
  uri.searchParams.append('redirect_after_oidc', REDIRECT_SCHEME)
  uri.searchParams.append(mode === 'signup' ? 'register' : 'login', 'true')
  uri.searchParams.append('app', 'twake-drive')
  return uri
}
