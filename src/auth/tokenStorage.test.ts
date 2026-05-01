import * as SecureStore from 'expo-secure-store'

import { saveSession, getSession, clearSession, SESSION_KEY } from './tokenStorage'

const session = {
  uri: 'https://example.com',
  accessToken: 'access-1',
  refreshToken: 'refresh-1'
}

describe('tokenStorage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('saveSession serializes the session under SESSION_KEY', async () => {
    await saveSession(session)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(SESSION_KEY, JSON.stringify(session))
  })

  it('getSession returns parsed session when present', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(session))
    expect(await getSession()).toEqual(session)
  })

  it('getSession returns null when nothing stored', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
    expect(await getSession()).toBeNull()
  })

  it('getSession returns null on malformed JSON and clears storage', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('not-json')
    expect(await getSession()).toBeNull()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY)
  })

  it('clearSession deletes the stored item', async () => {
    await clearSession()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY)
  })
})
