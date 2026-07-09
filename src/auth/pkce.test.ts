import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

import { openLoginUrl, openAuthorizeUrl } from './pkce'
import { UserCancelledError } from './types'

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  openAuthSessionAsync: jest.fn(),
  dismissBrowser: jest.fn(() => Promise.resolve())
}))
jest.mock('expo-linking', () => ({ addEventListener: jest.fn() }))
jest.mock('expo-crypto', () => ({}))

const wb = WebBrowser as unknown as {
  openBrowserAsync: jest.Mock
  openAuthSessionAsync: jest.Mock
  dismissBrowser: jest.Mock
}
const linking = Linking as unknown as { addEventListener: jest.Mock }

describe('openLoginUrl (shared-jar Custom Tab)', () => {
  let urlHandler: (e: { url: string }) => void
  let remove: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    remove = jest.fn()
    linking.addEventListener.mockImplementation(
      (_evt: string, cb: (e: { url: string }) => void) => {
        urlHandler = cb
        return { remove }
      }
    )
    wb.dismissBrowser.mockReturnValue(undefined)
  })

  it('opens openBrowserAsync (SFVC jar), never an auth session', () => {
    wb.openBrowserAsync.mockReturnValue(new Promise(() => undefined))
    void openLoginUrl('https://login.example.com/oauth')
    expect(wb.openBrowserAsync).toHaveBeenCalledWith('https://login.example.com/oauth', {
      showInRecents: true
    })
    expect(wb.openAuthSessionAsync).not.toHaveBeenCalled()
  })

  it('resolves with the cozy:// redirect captured via the deep-link listener', async () => {
    wb.openBrowserAsync.mockReturnValue(new Promise(() => undefined))
    const p = openLoginUrl('https://x/oauth')
    urlHandler({ url: 'cozy://?code=abc123' })
    await expect(p).resolves.toBe('cozy://?code=abc123')
    expect(remove).toHaveBeenCalled()
  })

  it('lets a redirect win over a racing tab-close', async () => {
    wb.openBrowserAsync.mockResolvedValue({ type: 'cancel' })
    const p = openLoginUrl('https://x/oauth')
    urlHandler({ url: 'cozy://?code=win' })
    await expect(p).resolves.toBe('cozy://?code=win')
  })
})

describe('openAuthorizeUrl (native auth session)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('opens openAuthSessionAsync and returns the cozy:// redirect on success', async () => {
    wb.openAuthSessionAsync.mockResolvedValueOnce({ type: 'success', url: 'cozy://?code=abc' })
    await expect(openAuthorizeUrl('https://x/auth/authorize')).resolves.toBe('cozy://?code=abc')
    expect(wb.openAuthSessionAsync).toHaveBeenCalledWith('https://x/auth/authorize', 'cozy://', {
      showInRecents: false
    })
  })

  it('rejects UserCancelledError when the session is cancelled', async () => {
    wb.openAuthSessionAsync.mockResolvedValueOnce({ type: 'cancel' })
    await expect(openAuthorizeUrl('https://x/auth/authorize')).rejects.toBeInstanceOf(
      UserCancelledError
    )
  })
})
