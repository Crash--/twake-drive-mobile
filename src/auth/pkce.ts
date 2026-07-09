import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'

import { UserCancelledError } from './types'

export const REDIRECT_URL = 'cozy://'

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export const generatePkce = async (): Promise<{ codeVerifier: string; codeChallenge: string }> => {
  const verifierBytes = Crypto.getRandomBytes(32)
  const codeVerifier = base64UrlEncode(verifierBytes)
  const challengeB64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  )
  const codeChallenge = challengeB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { codeVerifier, codeChallenge }
}

export const normalizeRedirectUrl = (raw: string): string => {
  let url = raw
  if (url.startsWith('cozy:?')) url = url.replace('cozy:?', 'cozy://?')
  url = url.replace(/%23$/i, '').replace(/#$/, '')
  return url
}

export const openAuthorizeUrl = async (url: string): Promise<string> => {
  console.log('[auth] opening authorize URL', url.split('?')[0])
  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URL, {
    showInRecents: false
  })
  if (result.type === 'success' && result.url) {
    return normalizeRedirectUrl(result.url)
  }
  throw new UserCancelledError()
}

export const openLoginUrl = async (url: string): Promise<string> => {
  console.log('[auth] opening login URL', url.split('?')[0])
  return await new Promise<string>((resolve, reject) => {
    let settled = false
    let sub: ReturnType<typeof Linking.addEventListener> | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (run: () => void): void => {
      if (settled) return
      settled = true
      sub?.remove()
      if (timer) clearTimeout(timer)
      try {
        void Promise.resolve(WebBrowser.dismissBrowser()).catch(() => undefined)
      } catch {
        // dismissing the tab is best-effort
      }
      run()
    }
    sub = Linking.addEventListener('url', ({ url: incoming }) => {
      if (incoming?.startsWith('cozy:')) {
        console.log('[auth] captured cozy:// redirect via deep link')
        finish(() => resolve(normalizeRedirectUrl(incoming)))
      }
    })
    WebBrowser.openBrowserAsync(url, { showInRecents: true }).then(
      () => {
        timer = setTimeout(() => finish(() => reject(new UserCancelledError())), 4000)
      },
      (err: unknown) => finish(() => reject(err as Error))
    )
  })
}
