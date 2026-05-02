import { Linking } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { parseCallbackUrl, startOidcFlow } from './oidcFlow'
import { UserCancelledError } from './types'

describe('parseCallbackUrl', () => {
  it('extracts fqdn, code, and defaultRedirection from a callback URL', () => {
    const url = 'cozy://?fqdn=alice.example.com&code=abc123&default_redirection=files/'
    expect(parseCallbackUrl(url)).toEqual({
      fqdn: 'alice.example.com',
      code: 'abc123',
      defaultRedirection: 'files/'
    })
  })

  it('returns defaultRedirection as null when missing', () => {
    const url = 'cozy://?fqdn=alice.example.com&code=abc'
    expect(parseCallbackUrl(url)).toEqual({
      fqdn: 'alice.example.com',
      code: 'abc',
      defaultRedirection: null
    })
  })

  it('throws when fqdn is missing', () => {
    expect(() => parseCallbackUrl('cozy://?code=abc')).toThrow(/fqdn/)
  })

  it('throws when code is missing', () => {
    expect(() => parseCallbackUrl('cozy://?fqdn=alice.example.com')).toThrow(/code/)
  })

  it('throws on a malformed URL', () => {
    expect(() => parseCallbackUrl('not a url')).toThrow()
  })
})

describe('startOidcFlow', () => {
  let urlListeners: Array<(event: { url: string }) => void> = []
  const subscription = { remove: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    urlListeners = []
    ;(Linking.addEventListener as jest.Mock) = jest.fn((event, cb) => {
      if (event === 'url') {
        urlListeners.push(cb)
      }
      return subscription
    })
    ;(WebBrowser.openBrowserAsync as jest.Mock) = jest
      .fn()
      .mockResolvedValue({ type: 'opened' })
    ;(WebBrowser.dismissBrowser as jest.Mock) = jest.fn().mockResolvedValue(undefined)
  })

  it('resolves with parsed callback when a deep link arrives', async () => {
    const promise = startOidcFlow(new URL('https://login.example.com/oauth'))
    urlListeners[0]({ url: 'cozy://?fqdn=alice.example.com&code=tok' })
    await expect(promise).resolves.toEqual({
      fqdn: 'alice.example.com',
      code: 'tok',
      defaultRedirection: null
    })
  })

  it('rejects with UserCancelledError when the browser is dismissed', async () => {
    ;(WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValueOnce({ type: 'cancel' })
    await expect(startOidcFlow(new URL('https://login.example.com/oauth'))).rejects.toBeInstanceOf(
      UserCancelledError
    )
  })

  it('rejects when the deep link is malformed', async () => {
    const promise = startOidcFlow(new URL('https://login.example.com/oauth'))
    urlListeners[0]({ url: 'cozy://?missing=params' })
    await expect(promise).rejects.toThrow()
  })
})
