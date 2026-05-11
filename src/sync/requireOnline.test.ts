import { requireOnline } from './requireOnline'

const t = ((key: string) => `__${key}__`) as never

describe('requireOnline', () => {
  it('returns true and does not snackbar when status is idle', () => {
    const showSnackbar = jest.fn()
    expect(requireOnline('idle', showSnackbar, t)).toBe(true)
    expect(showSnackbar).not.toHaveBeenCalled()
  })

  it('returns true and does not snackbar when status is syncing', () => {
    const showSnackbar = jest.fn()
    expect(requireOnline('syncing', showSnackbar, t)).toBe(true)
    expect(showSnackbar).not.toHaveBeenCalled()
  })

  it('returns false and snackbars when status is offline', () => {
    const showSnackbar = jest.fn()
    expect(requireOnline('offline', showSnackbar, t)).toBe(false)
    expect(showSnackbar).toHaveBeenCalledWith('__drive.offline.requiresOnline__')
  })

  it('returns false and snackbars when status is error (assume connectivity issue)', () => {
    const showSnackbar = jest.fn()
    expect(requireOnline('error', showSnackbar, t)).toBe(false)
    expect(showSnackbar).toHaveBeenCalled()
  })
})
