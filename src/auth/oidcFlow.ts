import * as WebBrowser from 'expo-web-browser'

import { OidcCallback, UserCancelledError } from './types'

const REDIRECT_URL = 'cozy://'

export const parseCallbackUrl = (callbackUrl: string): OidcCallback => {
  const url = new URL(callbackUrl)
  const fqdn = url.searchParams.get('fqdn')
  const code = url.searchParams.get('code')
  const defaultRedirection = url.searchParams.get('default_redirection')

  if (!fqdn) throw new Error('Callback URL missing fqdn')
  if (!code) throw new Error('Callback URL missing code')

  return { fqdn, code, defaultRedirection }
}

export const startOidcFlow = async (loginUri: URL): Promise<OidcCallback> => {
  console.log('[oidcFlow] opening', loginUri.toString())
  const result = await WebBrowser.openAuthSessionAsync(loginUri.toString(), REDIRECT_URL, {
    showInRecents: false
  })
  console.log('[oidcFlow] result', JSON.stringify(result))

  if (result.type === 'success' && result.url) {
    return parseCallbackUrl(result.url)
  }
  throw new UserCancelledError()
}
