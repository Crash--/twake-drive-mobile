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
    expect(parseCallbackUrl('cozy://?fqdn=alice.example.com&code=abc')).toEqual({
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
  beforeEach(() => jest.clearAllMocks())

  it('returns parsed callback when openAuthSessionAsync resolves with success', async () => {
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'cozy://?fqdn=alice.example.com&code=tok'
    })
    const result = await startOidcFlow(new URL('https://login.example.com/oauth'))
    expect(result).toEqual({ fqdn: 'alice.example.com', code: 'tok', defaultRedirection: null })
  })

  it('throws UserCancelledError on cancel', async () => {
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'cancel' })
    await expect(startOidcFlow(new URL('https://login.example.com/oauth'))).rejects.toBeInstanceOf(
      UserCancelledError
    )
  })

  it('throws UserCancelledError on dismiss', async () => {
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' })
    await expect(startOidcFlow(new URL('https://login.example.com/oauth'))).rejects.toBeInstanceOf(
      UserCancelledError
    )
  })
})
