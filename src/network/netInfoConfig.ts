import NetInfo from '@react-native-community/netinfo'

/**
 * Configure NetInfo with a small reachability HTTP ping.
 *
 * Why: on iOS simulator (and sometimes on physical devices behind weird
 * NATs), the OS-level "connected to a network" flag stays `true` even when
 * the underlying network is down — so the app doesn't realize it's offline
 * until something tries to fetch and times out.
 *
 * The reachability ping is a periodic HEAD request to a tiny well-known
 * endpoint. NetInfo emits `isInternetReachable: false` quickly when the
 * ping fails, which lets `useIsOnline` react in seconds rather than minutes.
 *
 * Call once at app boot (idempotent — NetInfo.configure replaces the
 * previous config).
 */
let configured = false
export const configureNetInfo = (): void => {
  if (configured) return
  configured = true
  NetInfo.configure({
    reachabilityUrl: 'https://clients3.google.com/generate_204',
    reachabilityTest: async (response: Response) =>
      Promise.resolve(response.status === 204),
    // Ping every 30 s when online — enough to notice the connection died
    // without burning much battery.
    reachabilityLongTimeout: 30 * 1000,
    // Once we've detected offline, ping every 5 s so we recover quickly.
    reachabilityShortTimeout: 5 * 1000,
    // Drop the request after 8 s — anything longer is offline territory.
    reachabilityRequestTimeout: 8 * 1000,
    reachabilityShouldRun: () => true,
    shouldFetchWiFiSSID: false,
    useNativeReachability: false
  })
}
