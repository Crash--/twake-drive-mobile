import { Linking } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { OidcCallback, UserCancelledError } from './types'

export const parseCallbackUrl = (callbackUrl: string): OidcCallback => {
  const url = new URL(callbackUrl)
  const fqdn = url.searchParams.get('fqdn')
  const code = url.searchParams.get('code')
  const defaultRedirection = url.searchParams.get('default_redirection')

  if (!fqdn) throw new Error('Callback URL missing fqdn')
  if (!code) throw new Error('Callback URL missing code')

  return { fqdn, code, defaultRedirection }
}

export const startOidcFlow = (loginUri: URL): Promise<OidcCallback> => {
  return new Promise((resolve, reject) => {
    let settled = false
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (settled) return
      try {
        const callback = parseCallbackUrl(url)
        settled = true
        subscription.remove()
        void WebBrowser.dismissBrowser()
        resolve(callback)
      } catch (e) {
        settled = true
        subscription.remove()
        void WebBrowser.dismissBrowser()
        reject(e)
      }
    })

    void WebBrowser.openBrowserAsync(loginUri.toString(), {
      dismissButtonStyle: 'cancel',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
    })
      .then(result => {
        if (settled) return
        if (result.type === 'cancel' || result.type === 'dismiss') {
          settled = true
          subscription.remove()
          reject(new UserCancelledError())
        }
      })
      .catch(err => {
        if (settled) return
        settled = true
        subscription.remove()
        reject(err)
      })
  })
}
