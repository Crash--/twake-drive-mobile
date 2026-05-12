import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

jest.mock('@react-native-community/netinfo', () => {
  let listener: ((s: Partial<NetInfoState>) => void) | undefined
  return {
    addEventListener: jest.fn((cb: (s: Partial<NetInfoState>) => void) => {
      listener = cb
      return () => { listener = undefined }
    }),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
    __emit: (s: Partial<NetInfoState>) => listener?.(s)
  }
})

const flush = (): Promise<void> => new Promise(resolve => setImmediate(resolve))

const fetchMock = jest.fn()
;(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch

import { createOnlineMonitor } from './OnlineMonitor'

describe('OnlineMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ status: 200 } as unknown as Response)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('reports online from initial NetInfo state', async () => {
    const mon = createOnlineMonitor({ probeUri: 'https://stack.example.com' })
    await flush()
    expect(mon.getCurrent()).toBe(true)
    expect(mon.getNetType()).toBe('wifi')
  })

  it('flips to offline on NetInfo offline event and notifies subscribers', async () => {
    const mon = createOnlineMonitor({ probeUri: 'https://stack.example.com' })
    await flush()
    const listener = jest.fn()
    mon.subscribe(listener)
    ;(NetInfo as unknown as { __emit: (s: Partial<NetInfoState>) => void }).__emit({
      isConnected: false,
      isInternetReachable: false,
      type: 'none'
    })
    expect(listener).toHaveBeenCalledWith(false)
    expect(mon.getCurrent()).toBe(false)
  })

  it('falls back to probe when NetInfo says offline', async () => {
    const mon = createOnlineMonitor({ probeUri: 'https://stack.example.com', probeIntervalMs: 1000 })
    await flush()
    ;(NetInfo as unknown as { __emit: (s: Partial<NetInfoState>) => void }).__emit({
      isConnected: false,
      isInternetReachable: false,
      type: 'none'
    })
    expect(mon.getCurrent()).toBe(false)
    jest.advanceTimersByTime(1000)
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('https://stack.example.com/status', expect.any(Object))
    expect(mon.getCurrent()).toBe(true)
  })

  it('unsubscribe stops notifications', async () => {
    const mon = createOnlineMonitor({ probeUri: 'https://stack.example.com' })
    await flush()
    const listener = jest.fn()
    const off = mon.subscribe(listener)
    off()
    ;(NetInfo as unknown as { __emit: (s: Partial<NetInfoState>) => void }).__emit({
      isConnected: false,
      isInternetReachable: false,
      type: 'none'
    })
    expect(listener).not.toHaveBeenCalled()
  })
})
