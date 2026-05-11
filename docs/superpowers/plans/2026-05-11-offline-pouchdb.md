# Offline Cache (PouchDB + SQLite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache `io.cozy.files`, `io.cozy.sharings`, `io.cozy.permissions`, `io.cozy.notes`, `io.cozy.contacts` locally in SQLite via `cozy-pouch-link` (`fromRemote` replication only, mutations always go through StackLink), so the user can browse their tree offline.

**Architecture:** `cozy-client` receives a `links` array `[PouchLink, StackLink]` **unconditionally** (no feature flag). PouchLink intercepts queries for the 5 targeted doctypes, serves them from the local PouchDB (adapter `react-native-sqlite` powered by `@op-engineering/op-sqlite`), and triggers a debounced `fromRemote` replication. Mutations bypass Pouch and go directly to StackLink; sync is re-triggered by three mechanisms: (a) the initial cold-start / post-login sync, (b) periodic background sync every 60 seconds (`periodicSync: true`, `replicationInterval: 60000`), and (c) an explicit trigger after every successful mutation. There is no realtime hook (see Amendments at the bottom). The `platformReactNative` shim provides storage (sync KV via `react-native-mmkv`), events (online/offline/pause/resume), isOnline (via `@react-native-community/netinfo`) and `pouchAdapter`.

**Tech Stack (additions):** `cozy-pouch-link@60.24.0`, `pouchdb-core@^8.0.1`, `pouchdb-adapter-react-native-sqlite@^4.1.3`, `pouchdb-find@^8.0.1`, `pouchdb-mapreduce@^8.0.1`, `pouchdb-replication@^8.0.1`, `pouchdb-adapter-http@^8.0.1`, `@op-engineering/op-sqlite@15.0.7`, `@craftzdog/pouchdb-collate-react-native@^7.3.0`, `@craftzdog/react-native-buffer@^6.0.5`, `react-native-quick-crypto@^0.7.17`, `readable-stream@^4.5.2`, `react-native-get-random-values@^1.11.0`, `@react-native-community/netinfo@^11.4.1`, `cozy-realtime@^60.24.0`, `cozy-device-helper@^4.0.3` (already present), `react-native-mmkv@^4.0.0` (sync KV backing the storage shim).

**References:** primary reference is `/Users/quentinvalmori/Sites/cozy-flagship-app` — useful files to study include `src/pouchdb/pouchdb.js` (canonical adapter wiring), `src/pouchdb/platformReactNative.*` (shim layout), `src/app/domain/offline/*` (replication trigger helpers), `src/libs/clientHelpers/createClient.ts`, `babel.config.js`, `__tests__/jestSetupFile.js:126-137`. Flagship is one reference among others; we adapt patterns where they fit and diverge where the drive-mobile context calls for it.

**Working directory:** `/Users/quentinvalmori/Sites/Linagora/twake-drive-mobile/`

---

## Storage layers

Two distinct on-device storage layers cooperate. They serve different purposes and must not be conflated:

- **SQLite (via `@op-engineering/op-sqlite` + `pouchdb-adapter-react-native-sqlite`).** This is the **offline cache itself**. Every cached document (`io.cozy.files`, `io.cozy.sharings`, `io.cozy.permissions`, `io.cozy.notes`, `io.cozy.contacts`) lives in SQLite as a PouchDB row. This is what the user sees when browsing offline. Size grows with the size of the user's tree.
- **MMKV (via `react-native-mmkv`).** Small, fast, **synchronous** key-value store. `cozy-pouch-link` requires a sync `platform.storage` (its internal `_local/*` checkpoint API is sync); MMKV provides exactly that natively at ~30 KB / ~10× the throughput of AsyncStorage. MMKV holds only `cozy-pouch-link`'s replication metadata: last sequence per doctype, sync state, etc. **Not used for documents.** A few hundred bytes total per user.

Alternatives considered for the MMKV slot, and why MMKV won:
- `@react-native-async-storage/async-storage` — async-only API; would require a sync wrapper. Awkward and doesn't match what cozy-pouch-link expects out of the box.
- `expo-secure-store` (already installed for OAuth tokens) — encrypted, but much slower; overkill for sync checkpoints that are not sensitive.
- In-memory only — would lose checkpoints on every cold start and force a from-scratch replication each boot. Wastes bandwidth and battery.
- A KV-over-SQLite shim — pointless extra code when MMKV already exists for exactly this use case.

---

## Targeted doctypes (offlineDoctypes)

```ts
export const offlineDoctypes = [
  'io.cozy.files',
  'io.cozy.sharings',
  'io.cozy.permissions',
  'io.cozy.notes',
  'io.cozy.contacts'
]
```

A strict subset of the broader list found in references such as flagship's `src/pouchdb/getLinks.ts:20-44`. All on the `fromRemote` strategy — no conflicts to resolve.

---

## Phase 0 — Native deps + babel shims

### New Architecture decision: KEEP ENABLED.

**Note.** We keep React Native's New Architecture enabled — it is the default in Expo SDK 54. We accept a small additional integration risk on the native libraries this plan introduces, namely `react-native-quick-crypto@0.7.x`, `pouchdb-adapter-react-native-sqlite@4.x` and `@op-engineering/op-sqlite@15.x`. If a runtime regression specific to the New Architecture surfaces (a native crash at boot or at the first `_putLocal`), the fallback is a small three-file change documented in the Amendments section at the bottom. No "disable New Arch" task is part of this plan.

### Task 0.1: Install runtime deps

**Files:**
- Modify: `package.json`

**Steps:**

- [ ] Run the install as a single `npm install` for peer-dep consistency:

  ```bash
  npm install --save \
    cozy-pouch-link@60.24.0 \
    cozy-realtime@60.24.0 \
    pouchdb-core@^8.0.1 \
    pouchdb-find@^8.0.1 \
    pouchdb-mapreduce@^8.0.1 \
    pouchdb-replication@^8.0.1 \
    pouchdb-adapter-http@^8.0.1 \
    pouchdb-adapter-react-native-sqlite@^4.1.3 \
    @op-engineering/op-sqlite@15.0.7 \
    @craftzdog/pouchdb-collate-react-native@^7.3.0 \
    @craftzdog/react-native-buffer@^6.0.5 \
    react-native-quick-crypto@^0.7.17 \
    readable-stream@^4.5.2 \
    react-native-get-random-values@^1.11.0 \
    @react-native-community/netinfo@^11.4.1 \
    react-native-mmkv@^4.0.0 \
    events@^3.3.0
  ```

  > **Compatibility note.** `cozy-pouch-link@60.24.0` aligns with `cozy-client@60.24.0` (already pinned in drive-mobile). Its `peerDependencies` wants `@op-engineering/op-sqlite *` — we pin `15.0.7` (the version `pouchdb-adapter-react-native-sqlite@4.1.3` brings in itself). No conflict. Verified via `npm view cozy-pouch-link@60.24.0 dependencies peerDependencies`.

  > The fact that `cozy-pouch-link` declares `pouchdb-browser` as a direct dependency is **intentional**: it is the web fallback. It is only used when `platform.pouchAdapter` is not provided. We force the RN adapter (Task 1.1 + assertion in 6.2).

- [ ] Pin `@op-engineering/op-sqlite` in `package.json` via `"resolutions"` (yarn) **or** `"overrides"` (npm) to guarantee a single native copy:

  ```json
  "overrides": {
    "@op-engineering/op-sqlite": "15.0.7"
  }
  ```

  Add at the root of `package.json`.

- [ ] Run `npm install` (re-resolution with overrides).
- [ ] Verify `npm ls @op-engineering/op-sqlite` returns a single entry.
- [ ] Commit: `chore(deps): install pouchdb + cozy-pouch-link + native shims`.

### Task 0.2: Babel aliases (Node shims for RN)

**Files:**
- Modify: `babel.config.js`

**Steps:**

- [ ] Replace the contents of `babel.config.js` with:

  ```js
  module.exports = function (api) {
    api.cache(true)
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        [
          'module-resolver',
          {
            root: ['./'],
            alias: {
              '@': './src',
              // PouchDB / Node shims for React Native
              'pouchdb-collate': '@craftzdog/pouchdb-collate-react-native',
              crypto: 'react-native-quick-crypto',
              stream: 'readable-stream',
              buffer: '@craftzdog/react-native-buffer'
            },
            extensions: [
              '.ios.js',
              '.android.js',
              '.native.js',
              '.js',
              '.jsx',
              '.json',
              '.ts',
              '.tsx'
            ]
          }
        ],
        'react-native-worklets/plugin'
      ]
    }
  }
  ```

  > The 4 aliases match the canonical RN-PouchDB wiring (see `cozy-flagship-app/babel.config.js:10-15` for a reference). Without them, PouchDB tries to import Node-native `crypto` / `stream` / `buffer`, which don't exist in RN.

  > `react-native-worklets/plugin` is already transitively required by `react-native-reanimated@4` — we add it explicitly to avoid a silent regression.

- [ ] Add `react-native-worklets` to `jest.config.js`'s `transformIgnorePatterns` if needed (we'll see in Phase 6).
- [ ] Run `npx expo start --clear` to flush Metro's cache and confirm the bundler doesn't choke on the aliases (no need to wait for the app to start — just check the bundler doesn't crash).
- [ ] Commit: `chore(babel): add crypto/stream/buffer/pouchdb-collate aliases for RN`.

### Task 0.3: Native rebuild

**Files:**
- Modify: `ios/Podfile.lock`, `ios/Pods/` (generated)
- Modify: `android/` (generated)

**Steps:**

- [ ] Run `npx expo prebuild --clean` to regenerate iOS + Android with the new native deps (`op-sqlite`, `quick-crypto`, `netinfo`, `mmkv`).
- [ ] Run `cd ios && pod install && cd ..`.
- [ ] Run `npx expo run:ios --device` on a physical device (the iOS simulator works for `op-sqlite` but not for the biometric use-cases we'll add later).
- [ ] Verify the app boots without crash on the auth screen (nothing in Pouch is running yet).
- [ ] Run `npx expo run:android` on an emulator and verify the same.
- [ ] Commit: `chore(native): prebuild + pod install with pouch native deps`.

### Phase 0 gate

Pass criterion: the app boots on iOS + Android **with New Arch ON**, we reach the auth screen, no native crash on loading `react-native-quick-crypto` / `op-sqlite`. If a crash specifically tied to the New Architecture appears (Fabric/TurboModule registration errors), consider the fallback documented in the Amendments section. Otherwise: do **not** continue to Phase 1; investigate (Xcode logs + `adb logcat`).

---

## Phase 1 — PouchDB instance + platformReactNative shim

### Task 1.1: PouchDB instance

**Files:**
- Create: `src/pouchdb/pouchdb.ts`

**Steps:**

- [ ] Create `src/pouchdb/pouchdb.ts`:

  ```ts
  // Side-effect import: polyfill crypto.getRandomValues (required by pouchdb-utils)
  // eslint-disable-next-line import/order
  import 'react-native-get-random-values'

  import HttpPouch from 'pouchdb-adapter-http'
  // @ts-expect-error no types
  import SQLiteAdapter from 'pouchdb-adapter-react-native-sqlite'
  import PouchDB from 'pouchdb-core'
  import PouchDBFind from 'pouchdb-find'
  // @ts-expect-error no types
  import mapreduce from 'pouchdb-mapreduce'
  // @ts-expect-error no types
  import replication from 'pouchdb-replication'

  export default PouchDB.plugin(HttpPouch)
    .plugin(PouchDBFind)
    .plugin(replication)
    .plugin(mapreduce)
    .plugin(SQLiteAdapter)
  ```

  > Mirrors the canonical adapter wiring shown in `cozy-flagship-app/src/pouchdb/pouchdb.js`. The plugin order is deliberate: HTTP adapter first (for remote replication), SQLite last (so it becomes the default adapter).

- [ ] Commit: `feat(pouchdb): add core PouchDB instance with SQLite adapter`.

### Task 1.2: Storage shim (MMKV)

**Files:**
- Create: `src/pouchdb/platformReactNative.storage.ts`

**Steps:**

- [ ] Create the shim. We use `react-native-mmkv` (synchronous, ~10× faster than AsyncStorage). This is the small KV store described in the "Storage layers" section above — it holds cozy-pouch-link's replication checkpoints/sequences, not documents.

  ```ts
  import { MMKV } from 'react-native-mmkv'

  const mmkv = new MMKV({ id: 'pouchdb-meta' })

  export const storage = {
    getItem: async (key: string): Promise<string | null> => {
      return Promise.resolve(mmkv.getString(key) ?? null)
    },
    setItem: async (key: string, value: string | undefined): Promise<void> => {
      if (value === undefined) return Promise.resolve()
      mmkv.set(key, value)
      return Promise.resolve()
    },
    removeItem: async (key: string): Promise<boolean> => {
      mmkv.delete(key)
      return Promise.resolve(true)
    }
  }
  ```

  > Layout mirrors `cozy-flagship-app/src/pouchdb/platformReactNative.storage.ts` but via a dedicated MMKV instance (not a global store). `cozy-pouch-link` only writes lightweight metadata (`_local/*` checkpoints) to this layer — not the docs themselves (those live in SQLite, see Storage layers section).

- [ ] Commit: `feat(pouchdb): add MMKV-backed storage shim`.

### Task 1.3: AppState shim

**Files:**
- Create: `src/pouchdb/platformReactNative.appState.ts`

**Steps:**

- [ ] Copy `cozy-flagship-app/src/pouchdb/platformReactNative.appState.ts` verbatim, replacing `cozy-minilog` with `console.debug` or by adding `cozy-minilog` (already in `package.json`).

  ```ts
  import EventEmitter from 'events'
  import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native'
  import Minilog from 'cozy-minilog'

  const log = Minilog('PouchDB.appState')

  let appState = AppState.currentState
  let appStateHandler: NativeEventSubscription | undefined

  export const listenAppState = (eventEmitter: EventEmitter): void => {
    appStateHandler = AppState.addEventListener('change', nextAppState => {
      log.debug('AppState event', nextAppState)
      if (isGoingToSleep(nextAppState)) eventEmitter.emit('resume')
      if (isGoingToWakeUp(nextAppState)) eventEmitter.emit('pause')
      appState = nextAppState
    })
  }

  export const stopListeningAppState = (): void => {
    appStateHandler?.remove()
  }

  const isGoingToSleep = (next: AppStateStatus): boolean =>
    Boolean(appState.match(/active/) && next === 'background')

  const isGoingToWakeUp = (next: AppStateStatus): boolean =>
    Boolean(appState.match(/background/) && next === 'active')
  ```

  > Note: the event names are inverted compared to intuition (`resume` is fired when going to sleep, `pause` when waking up). This matches what `cozy-pouch-link` expects on its event emitter — see its handlers in `node_modules/cozy-pouch-link/dist/PouchManager.js`. **Do not "fix" this.**

- [ ] Commit: `feat(pouchdb): add AppState event bridge`.

### Task 1.4: NetInfo shim

**Files:**
- Create: `src/pouchdb/platformReactNative.netInfo.ts`

**Steps:**

- [ ] Create:

  ```ts
  import EventEmitter from 'events'
  import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo'
  import Minilog from 'cozy-minilog'

  const log = Minilog('PouchDB.netInfo')

  let netInfoHandler: NetInfoSubscription | undefined

  export const listenNetInfo = (eventEmitter: EventEmitter): void => {
    netInfoHandler = NetInfo.addEventListener(state => {
      log.debug('NetInfo event isConnected=', state.isConnected)
      if (state.isConnected) eventEmitter.emit('online')
      else eventEmitter.emit('offline')
    })
  }

  export const stopListeningNetInfo = (): void => {
    netInfoHandler?.()
  }
  ```

- [ ] Commit: `feat(pouchdb): add NetInfo event bridge`.

### Task 1.5: isOnline helper

**Files:**
- Create: `src/pouchdb/platformReactNative.isOnline.ts`

**Steps:**

- [ ] Create:

  ```ts
  import NetInfo from '@react-native-community/netinfo'

  let currentState: boolean | undefined

  export const isOnline = async (): Promise<boolean> => {
    if (currentState === undefined) {
      const state = await NetInfo.fetch()
      currentState = state.isConnected ?? true
      NetInfo.addEventListener(s => {
        currentState = s.isConnected ?? true
      })
    }
    return currentState
  }
  ```

  > Simpler than `cozy-flagship-app`'s `NetService.isConnected()` (which adds captive-portal handling — not needed for v1).

- [ ] Commit: `feat(pouchdb): add isOnline helper`.

### Task 1.6: Events emitter

**Files:**
- Create: `src/pouchdb/platformReactNative.events.ts`

**Steps:**

- [ ] Create:

  ```ts
  import { EventEmitter } from 'events'
  import { listenAppState } from './platformReactNative.appState'
  import { listenNetInfo } from './platformReactNative.netInfo'

  export const pouchDbEmitter = new EventEmitter()

  let started = false
  const startListening = (): void => {
    if (started) return
    started = true
    listenAppState(pouchDbEmitter)
    listenNetInfo(pouchDbEmitter)
  }

  startListening()

  export const events = {
    addEventListener: (name: string, handler: (...args: unknown[]) => void): void => {
      pouchDbEmitter.addListener(name, handler)
    },
    removeEventListener: (name: string, handler: (...args: unknown[]) => void): void => {
      pouchDbEmitter.removeListener(name, handler)
    }
  }
  ```

  > Idempotency guard (`started` flag) to avoid double-subscribe under Fast Refresh.

- [ ] Commit: `feat(pouchdb): wire AppState+NetInfo into the pouch event emitter`.

### Task 1.7: platformReactNative aggregator

**Files:**
- Create: `src/pouchdb/platformReactNative.ts`

**Steps:**

- [ ] Create:

  ```ts
  import { events } from './platformReactNative.events'
  import { isOnline } from './platformReactNative.isOnline'
  import { storage } from './platformReactNative.storage'
  import PouchDB from './pouchdb'

  export const platformReactNative = {
    storage,
    events,
    pouchAdapter: PouchDB,
    isOnline
  }
  ```

  > **Critical.** `pouchAdapter` must be the PouchDB instance **already plugged** with SQLiteAdapter (Task 1.1). If a bare PouchDB is passed, `cozy-pouch-link` falls back to `pouchdb-browser` (its default dependency) and the app crashes at the first `link.onLogin()`.

- [ ] Commit: `feat(pouchdb): export platformReactNative aggregator`.

### Task 1.8: useIsOnline hook

**Files:**
- Create: `src/network/useIsOnline.ts`
- Test: `src/network/useIsOnline.test.ts`

> **Why.** Mutations must be blocked outright when the device is offline (no offline queue — see Amendments). UI handlers need a synchronous-ish boolean they can branch on. `platformReactNative.isOnline.ts` (Task 1.5) is an async helper consumed by `cozy-pouch-link`; this hook is the UI-facing counterpart, returning a reactive boolean from React state.

**Steps:**

- [ ] Create the (failing) test:

  ```ts
  import { renderHook, act } from '@testing-library/react-native'
  import NetInfo from '@react-native-community/netinfo'
  import { useIsOnline } from './useIsOnline'

  jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(),
    fetch: jest.fn()
  }))

  describe('useIsOnline', () => {
    beforeEach(() => {
      ;(NetInfo.addEventListener as jest.Mock).mockReset()
      ;(NetInfo.fetch as jest.Mock).mockReset()
    })

    it('returns true initially while fetch is pending, then updates from fetch result', async () => {
      ;(NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false, isInternetReachable: false })
      ;(NetInfo.addEventListener as jest.Mock).mockReturnValue(() => undefined)
      const { result } = renderHook(() => useIsOnline())
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current).toBe(false)
    })

    it('flips to false when NetInfo event reports disconnected', async () => {
      ;(NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: true })
      let cb: ((s: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | undefined
      ;(NetInfo.addEventListener as jest.Mock).mockImplementation(fn => {
        cb = fn
        return () => undefined
      })
      const { result } = renderHook(() => useIsOnline())
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current).toBe(true)
      act(() => cb?.({ isConnected: false, isInternetReachable: false }))
      expect(result.current).toBe(false)
    })

    it('treats isInternetReachable === false as offline even when isConnected is true', async () => {
      ;(NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: false })
      ;(NetInfo.addEventListener as jest.Mock).mockReturnValue(() => undefined)
      const { result } = renderHook(() => useIsOnline())
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current).toBe(false)
    })
  })
  ```

- [ ] Run test, verify failure (module doesn't exist).
- [ ] Create `src/network/useIsOnline.ts`:

  ```ts
  import { useEffect, useState } from 'react'
  import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

  const computeOnline = (state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>): boolean =>
    Boolean(state.isConnected) && state.isInternetReachable !== false

  /**
   * Reactive online/offline boolean for UI gating.
   *
   * Returns `true` when the device reports a connection AND `isInternetReachable`
   * is not explicitly `false` (null is treated as "probably online" — matches
   * NetInfo's own semantics for platforms where reachability isn't measured yet).
   */
  export const useIsOnline = (): boolean => {
    const [online, setOnline] = useState<boolean>(true)
    useEffect(() => {
      let cancelled = false
      void NetInfo.fetch().then(state => {
        if (!cancelled) setOnline(computeOnline(state))
      })
      const unsubscribe = NetInfo.addEventListener(state => {
        setOnline(computeOnline(state))
      })
      return () => {
        cancelled = true
        unsubscribe()
      }
    }, [])
    return online
  }
  ```

- [ ] Run test, verify pass.
- [ ] Commit: `feat(network): add useIsOnline hook for UI gating`.

### Task 1.9: requireOnline guard helper

**Files:**
- Create: `src/network/requireOnline.ts`
- Test: `src/network/requireOnline.test.ts`

> **Why.** Centralizes the "if offline, snackbar + bail" pattern so every mutation entry point reads as a single line: `if (!requireOnline(isOnline, setSnackbar, t)) return`. Pure function — trivial to unit-test. Mirrors a pattern that existed in earlier drafts of the codebase and is well-understood by reviewers.

**Steps:**

- [ ] Create the (failing) test:

  ```ts
  import { requireOnline } from './requireOnline'

  describe('requireOnline', () => {
    const t = ((key: string) => key) as unknown as Parameters<typeof requireOnline>[2]

    it('returns true and does NOT call onOffline when online', () => {
      const onOffline = jest.fn()
      expect(requireOnline(true, onOffline, t)).toBe(true)
      expect(onOffline).not.toHaveBeenCalled()
    })

    it('returns false and calls onOffline with translated key when offline', () => {
      const onOffline = jest.fn()
      expect(requireOnline(false, onOffline, t)).toBe(false)
      expect(onOffline).toHaveBeenCalledWith('drive.offline.requiresOnline')
    })
  })
  ```

- [ ] Run test, verify failure.
- [ ] Create `src/network/requireOnline.ts`:

  ```ts
  import type { TFunction } from 'i18next'

  /**
   * Guard for mutation entry points. Call at the top of every UI handler that
   * triggers a write to the stack. Returns `false` and surfaces a snackbar when
   * the device is offline; the caller should `return` immediately on `false`.
   *
   * There is intentionally NO offline queue — mutations are blocked outright,
   * per the project's "no queue" rule (see plan Amendments).
   */
  export const requireOnline = (
    isOnline: boolean,
    onOffline: (message: string) => void,
    t: TFunction
  ): boolean => {
    if (isOnline) return true
    onOffline(t('drive.offline.requiresOnline'))
    return false
  }
  ```

- [ ] Run test, verify pass.
- [ ] Commit: `feat(network): add requireOnline guard helper`.

### Task 1.10: i18n keys for the offline guard

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/fr.json`

**Steps:**

- [ ] Add to `src/i18n/locales/en.json` under `drive` (creating the `offline` sub-object if absent) :

  ```json
  "offline": {
    "requiresOnline": "Available when you're back online"
  }
  ```

- [ ] Add to `src/i18n/locales/fr.json` under `drive` :

  ```json
  "offline": {
    "requiresOnline": "Disponible quand vous serez en ligne"
  }
  ```

  > Single key for v1 — the snackbar text is the same regardless of which mutation was attempted. If a per-action wording is later requested, expand to `drive.offline.requiresOnline.rename`, etc.

- [ ] Run `npm test` to verify no i18n parser tests regress (json must stay valid).
- [ ] Commit: `feat(i18n): add drive.offline.requiresOnline in en + fr`.

### Phase 1 gate

The app boots, the auth screen appears, `import { platformReactNative } from '@/pouchdb/platformReactNative'` is not yet referenced anywhere — so nothing changes at runtime. Visual verify: `npx expo start --clear`, then push a feature branch for CI lint/test.

---

## Phase 2 — Wire CozyPouchLink + client.login() at both entry points

### Task 2.1: getLinks helper

**Files:**
- Create: `src/pouchdb/getLinks.ts`
- Modify: `src/client/createClient.ts`
- Test: `src/pouchdb/getLinks.test.ts`

**Steps:**

- [ ] Create `src/pouchdb/getLinks.test.ts` (test fails first):

  ```ts
  jest.mock('cozy-pouch-link', () => {
    return jest.fn().mockImplementation(function (this: any, opts: unknown) {
      this.options = opts
    })
  })
  jest.mock('@/pouchdb/platformReactNative', () => ({
    platformReactNative: { pouchAdapter: 'POUCH_ADAPTER_SENTINEL' }
  }))

  import PouchLink from 'cozy-pouch-link'
  import { getLinks, offlineDoctypes } from './getLinks'

  describe('getLinks', () => {
    beforeEach(() => (PouchLink as unknown as jest.Mock).mockClear())

    it('returns [PouchLink, StackLink] in that order', () => {
      const links = getLinks()
      expect(links).toHaveLength(2)
      // PouchLink must be first so it intercepts cached doctypes before StackLink.
      expect((PouchLink as unknown as jest.Mock)).toHaveBeenCalledTimes(1)
    })

    it('passes platformReactNative.pouchAdapter to PouchLink (not pouchdb-browser)', () => {
      getLinks()
      const opts = (PouchLink as unknown as jest.Mock).mock.calls[0][0]
      expect(opts.platform.pouchAdapter).toBe('POUCH_ADAPTER_SENTINEL')
    })

    it('replicates every offlineDoctype with strategy=fromRemote', () => {
      getLinks()
      const opts = (PouchLink as unknown as jest.Mock).mock.calls[0][0]
      for (const dt of offlineDoctypes) {
        expect(opts.doctypesReplicationOptions[dt]).toEqual({ strategy: 'fromRemote' })
      }
    })

    it('targets exactly the 5 drive-mobile doctypes', () => {
      expect(offlineDoctypes).toEqual([
        'io.cozy.files',
        'io.cozy.sharings',
        'io.cozy.permissions',
        'io.cozy.notes',
        'io.cozy.contacts'
      ])
    })

    it('enables periodic sync with a 60 second interval', () => {
      getLinks()
      const opts = (PouchLink as unknown as jest.Mock).mock.calls[0][0]
      expect(opts.periodicSync).toBe(true)
      // cozy-pouch-link's option name (verified in
      // node_modules/cozy-pouch-link/types/CozyPouchLink.d.ts).
      expect(opts.replicationInterval).toBe(60_000)
    })
  })
  ```

- [ ] Run test, verify failure (module doesn't exist).
- [ ] Create `src/pouchdb/getLinks.ts`:

  ```ts
  import CozyClient, { CozyLink, StackLink } from 'cozy-client'
  import PouchLink from 'cozy-pouch-link'

  import { platformReactNative } from './platformReactNative'

  export const REPLICATION_DEBOUNCE = 60 * 1000 // 60s
  export const REPLICATION_DEBOUNCE_MAX_DELAY = 5 * 60 * 1000 // 5min
  // Periodic background sync: 60s. cozy-pouch-link's default is 30s; we double it
  // because drive metadata doesn't move fast enough to justify the battery cost
  // of polling twice a minute.
  export const PERIODIC_SYNC_INTERVAL_MS = 60 * 1000

  export const offlineDoctypes = [
    'io.cozy.files',
    'io.cozy.sharings',
    'io.cozy.permissions',
    'io.cozy.notes',
    'io.cozy.contacts'
  ] as const

  const doctypesReplicationOptions = Object.fromEntries(
    offlineDoctypes.map(dt => [dt, { strategy: 'fromRemote' as const }])
  )

  export const getLinks = (): CozyLink[] => {
    const pouchLink = new PouchLink({
      doctypes: [...offlineDoctypes],
      initialSync: false,
      periodicSync: true,
      replicationInterval: PERIODIC_SYNC_INTERVAL_MS,
      syncDebounceDelayInMs: REPLICATION_DEBOUNCE,
      syncDebounceMaxDelayInMs: REPLICATION_DEBOUNCE_MAX_DELAY,
      platform: platformReactNative,
      ignoreWarmup: true,
      doctypesReplicationOptions,
      pouch: {
        options: {
          adapter: 'react-native-sqlite'
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const stackLink = new StackLink()

    // PouchLink first → it intercepts queries for cached doctypes before StackLink.
    return [pouchLink as unknown as CozyLink, stackLink]
  }

  export const resetLinks = async (client?: CozyClient): Promise<void> => {
    if (!client) return
    for (const link of client.links) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (link as { reset?: () => Promise<void> }).reset?.()
    }
  }
  ```

  > Differences vs. the equivalent flagship file:
  > - 5 doctypes instead of 22.
  > - `PouchLink` is **active** (not commented out).
  > - No `RNRestart` (Expo Router handles re-mount on logout).
  > - No `performanceApi` (dropped for v1 — can come back).
  > - `periodicSync: true` + `replicationInterval: 60_000` — flagship currently relies on realtime + debounced triggers; we don't have a realtime backstop and use periodic sync to keep the cache fresh without burning battery (default cozy-pouch-link interval is 30 s; 60 s is plenty for drive metadata).
  > - `adapter: 'react-native-sqlite'` is the adapter name registered by `pouchdb-adapter-react-native-sqlite`.

- [ ] Run test, verify pass.
- [ ] Commit: `feat(pouchdb): add getLinks with PouchLink + StackLink chain`.

### Task 2.2: Wire links into createClient

**Files:**
- Modify: `src/client/createClient.ts`
- Modify: `src/client/createClient.test.ts`

**Steps:**

- [ ] Update `src/client/createClient.test.ts`: remove the `does NOT pass a links array` assertion (around line 35-39) and replace it with:

  ```ts
  it('passes a links array containing PouchLink + StackLink', () => {
    createClient(session)
    const opts = mockCozyClient.mock.calls[0][0] as Record<string, unknown>
    expect(Array.isArray(opts.links)).toBe(true)
    expect((opts.links as unknown[]).length).toBe(2)
  })
  ```

- [ ] Add to the `jest.mock` block (line 1) or at the top of the file:

  ```ts
  jest.mock('cozy-pouch-link', () => jest.fn().mockImplementation(() => ({})))
  jest.mock('@/pouchdb/platformReactNative', () => ({
    platformReactNative: { pouchAdapter: {} }
  }))
  ```

- [ ] Run test, verify failure (createClient still doesn't pass links).
- [ ] Modify `src/client/createClient.ts`:

  ```ts
  import CozyClient from 'cozy-client'
  import flag from 'cozy-flags'
  // @ts-expect-error cozy-realtime is not typed
  import { RealtimePlugin } from 'cozy-realtime'

  import { Session } from '@/auth/types'
  import { getLinks } from '@/pouchdb/getLinks'

  export const createClient = async (session: Session): Promise<CozyClient> => {
    const client = new CozyClient({
      uri: session.uri,
      oauth: { ...session.oauthOptions, token: session.token },
      scope: ['*'],
      appMetadata: {
        slug: 'twake-drive-mobile',
        version: '0.1.0'
      },
      links: getLinks()
    })

    await client.registerPlugin(flag.plugin, null)
    await client.registerPlugin(RealtimePlugin, {})

    // CRITICAL: client.login() fires link.onLogin() which initializes PouchManager.
    // Without this call, the local SQLite DB is never created and queries hang.
    await client.login({ uri: session.uri, token: session.token })

    return client
  }
  ```

  > Note: `createClient` becomes `async`. All callers must follow.

- [ ] Run test, verify pass.
- [ ] Commit: `feat(client): inject pouch link chain and call client.login()`.

### Task 2.3: Update callers of createClient

**Files:**
- Modify: `src/auth/useAuth.tsx`
- Test: `src/auth/useAuth.test.tsx`

**Steps:**

- [ ] See `src/auth/useAuth.tsx:32` (bootstrap path = cold-start reboot) and `:50` (post-login path). Both go through `createClient(session)`, which is now async.
- [ ] Update bootstrap (lines 26-34):

  ```ts
  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession()
      if (!session) {
        setState({ status: 'unauthenticated', client: null })
        return
      }
      try {
        const client = await createClient(session)
        setState({ status: 'authenticated', client })
      } catch (err) {
        console.warn('[useAuth] createClient failed on bootstrap', err)
        setState({ status: 'unauthenticated', client: null })
      }
    }
    void bootstrap()
  }, [])
  ```

- [ ] Update login path (line 50):

  ```ts
  const client = await createClient(session)
  setState({ status: 'authenticated', client })
  ```

  > **Both call sites must call `createClient` (which calls `client.login()`).** This mirrors the two-call-sites pattern in `cozy-flagship-app/src/libs/clientHelpers/createClient.ts:66` + `client.js:76`. If you forget the bootstrap path, the app reboots without Pouch initialized and every query on cached doctypes hangs on `link.onLogin not fired`.

- [ ] Run `npm test -- src/auth/useAuth.test.tsx`. Mock `cozy-pouch-link`, `cozy-realtime`, `@/pouchdb/*` as needed.
- [ ] Commit: `refactor(auth): await async createClient at both bootstrap and login`.

### Phase 2 gate

Run the app on a device, log in, watch Metro logs for:
- `[onLogin]` (from `cozy-pouch-link`)
- a React query (e.g. HomeScreen via `useQuery({ ... 'io.cozy.files' })`) resolving with data in <2 s online, and resolving from cache in <100 ms in airplane mode after a first sync.

If the first sync doesn't fire automatically (PouchLink starts with `initialSync: false`), that's expected — we trigger it manually in Phase 3. At this stage, just verify that `link.onLogin` fired and that `_local/checkpoint*` entries appear in SQLite (debug via the op-sqlite shell, or by running `mmkv.getAllKeys()` for checkpoints stored through the storage shim).

---

## Phase 3 — Sync triggers (initial + periodic + per-mutation)

> **No feature flag.** Offline cache is **always on**. There is no `offline.enabled` toggle and no SecureStore-cached flag. `getLinks()` unconditionally returns `[PouchLink, StackLink]` (see Phase 2). See Amendments at the bottom for the rationale.
>
> **No realtime backstop.** We do NOT subscribe to `cozy-realtime` events to re-trigger replication. The sync triggers are: (a) the initial post-login sync (Task 3.2), (b) periodic background sync every 60 seconds wired in Phase 2 via `periodicSync: true` + `replicationInterval: 60000` (verified in Task 3.11 below), and (c) explicit per-mutation triggers (Tasks 3.3 through 3.10). A change made from another client (web, desktop) appears in the mobile UI within ~60 s of the periodic tick — or sooner on the next local mutation / cold-start. Accepted trade-off vs. realtime.

### Task 3.1: triggerPouchReplication helper

**Files:**
- Create: `src/pouchdb/triggerReplication.ts`
- Test: `src/pouchdb/triggerReplication.test.ts`

**Steps:**

- [ ] Create the test:

  ```ts
  import CozyClient from 'cozy-client'
  import PouchLink from 'cozy-pouch-link'
  import { triggerPouchReplication } from './triggerReplication'

  jest.mock('cozy-pouch-link', () => jest.fn())

  const makeClient = (link: unknown): CozyClient =>
    ({ links: [link] } as unknown as CozyClient)

  describe('triggerPouchReplication', () => {
    it('calls startReplicationWithDebounce by default', () => {
      const link = Object.create((PouchLink as unknown as jest.Mock).prototype)
      link.startReplicationWithDebounce = jest.fn()
      link.startReplication = jest.fn()
      triggerPouchReplication(makeClient(link))
      expect(link.startReplicationWithDebounce).toHaveBeenCalled()
      expect(link.startReplication).not.toHaveBeenCalled()
    })

    it('calls startReplication immediately when "immediate" option is set', () => {
      const link = Object.create((PouchLink as unknown as jest.Mock).prototype)
      link.startReplication = jest.fn()
      link.startReplicationWithDebounce = jest.fn()
      triggerPouchReplication(makeClient(link), undefined, { immediate: true })
      expect(link.startReplication).toHaveBeenCalled()
      expect(link.startReplicationWithDebounce).not.toHaveBeenCalled()
    })

    it('accepts a doctype hint as 2nd arg (used by mutation sites)', () => {
      const link = Object.create((PouchLink as unknown as jest.Mock).prototype)
      link.startReplicationWithDebounce = jest.fn()
      triggerPouchReplication(makeClient(link), 'io.cozy.files')
      // For v1 the doctype hint is informational only (PouchLink syncs all configured doctypes)
      // but the signature is locked so we can specialize per-doctype later without churning callers.
      expect(link.startReplicationWithDebounce).toHaveBeenCalled()
    })

    it('is a no-op when no PouchLink in the chain', () => {
      expect(() => triggerPouchReplication(makeClient({}))).not.toThrow()
    })

    it('is a no-op when client is undefined', () => {
      expect(() => triggerPouchReplication(undefined)).not.toThrow()
    })
  })
  ```

- [ ] Create the implementation:

  ```ts
  import CozyClient from 'cozy-client'
  import PouchLink from 'cozy-pouch-link'
  import Minilog from 'cozy-minilog'

  const log = Minilog('PouchReplication')

  /**
   * Triggers a pouch replication.
   *
   * @param client    Cozy client (may be undefined; no-op).
   * @param doctype   Optional doctype hint. v1: informational only (the link replicates all
   *                  configured doctypes). The arg exists so mutation sites can declare WHICH
   *                  doctype they touched — useful for telemetry today, per-doctype sync later.
   * @param opts      `immediate: true` → bypasses the 60s debounce. Default false (debounced).
   */
  export const triggerPouchReplication = (
    client?: CozyClient,
    doctype?: string,
    opts: { immediate?: boolean } = {}
  ): void => {
    const pouchLink = getPouchLink(client)
    if (!pouchLink) return
    if (opts.immediate) {
      log.debug('startReplication (immediate)', doctype ?? '')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      ;(pouchLink as any).startReplication()
    } else {
      log.debug('startReplicationWithDebounce', doctype ?? '')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      ;(pouchLink as any).startReplicationWithDebounce()
    }
  }

  export const getPouchLink = (client?: CozyClient): PouchLink | null => {
    if (!client) return null
    return (client.links.find(l => l instanceof PouchLink) as PouchLink | undefined) ?? null
  }
  ```

  > Mirrors the helper in `cozy-flagship-app/src/app/domain/offline/utils.ts:7-29`. Difference: we drop the premature early `return` (lines 11-12 — that code is disabled there).

- [ ] Commit: `feat(pouchdb): add triggerPouchReplication helper`.

### Task 3.2: Trigger replication on first login + every cold start

**Files:**
- Modify: `src/client/createClient.ts`

**Steps:**

- [ ] Add to `createClient` (after `client.plugins.flags.initializing`):

  ```ts
  import { triggerPouchReplication } from '@/pouchdb/triggerReplication'
  // ...
  // Kick off the initial sync (non-blocking).
  triggerPouchReplication(client, undefined, { immediate: true })
  ```

  > `immediate: true` because we **want** the first sync to leave immediately (rather than wait for the debounce window). Mirrors the same pattern used in `cozy-flagship-app/src/libs/clientHelpers/AuthService.ts:43`.

- [ ] Commit: `feat(client): kick off initial pouch sync after login`.

### Task 3.3: Per-mutation forced resync — `renameEntry`

**Files:**
- Modify: `src/files/renameEntry.ts`
- Test: `src/files/renameEntry.test.ts`

> **Why this matters.** Without a realtime backstop, this is the **only** way the local cache stays fresh after a user action. PouchLink's internal 60s debounce is too slow for UX (user renames → swipes back → sees old name). We force an immediate-ish resync after every successful stack call. Listed once per mutation site so reviewers can audit coverage. Mirrors how PR #2 added these mutations one file at a time.

**Steps:**

- [ ] In `renameEntry`, after the successful stack call, add:

  ```ts
  import { triggerPouchReplication } from '@/pouchdb/triggerReplication'
  // ...
  await client.save(updatedDoc)
  triggerPouchReplication(client, 'io.cozy.files')
  ```

- [ ] Update test to assert `triggerPouchReplication` is called with `client` and `'io.cozy.files'`. Mock `@/pouchdb/triggerReplication` at the top of the test.
- [ ] Commit: `feat(pouchdb): re-sync after renameEntry`.

### Task 3.4: Per-mutation forced resync — `softDeleteEntry`

**Files:**
- Modify: `src/files/trashActions.ts` (function `softDeleteEntry`)
- Test: `src/files/trashActions.test.ts`

**Steps:**

- [ ] After the successful stack call in `softDeleteEntry`:

  ```ts
  await client.collection('io.cozy.files').destroy(doc)
  triggerPouchReplication(client, 'io.cozy.files')
  ```

- [ ] Test assertion as in 3.3.
- [ ] Commit: `feat(pouchdb): re-sync after softDeleteEntry`.

### Task 3.5: Per-mutation forced resync — `restoreEntry`

**Files:**
- Modify: `src/files/trashActions.ts` (function `restoreEntry`)
- Test: `src/files/trashActions.test.ts`

**Steps:**

- [ ] After the successful restore call:

  ```ts
  await client.collection('io.cozy.files').restore(doc._id)
  triggerPouchReplication(client, 'io.cozy.files')
  ```

- [ ] Test assertion.
- [ ] Commit: `feat(pouchdb): re-sync after restoreEntry`.

### Task 3.6: Per-mutation forced resync — `emptyTrash`

**Files:**
- Modify: `src/files/trashActions.ts` (function `emptyTrash`)
- Test: `src/files/trashActions.test.ts`

**Steps:**

- [ ] After the successful empty-trash call:

  ```ts
  await client.collection('io.cozy.files').emptyTrash()
  triggerPouchReplication(client, 'io.cozy.files')
  ```

- [ ] Test assertion.
- [ ] Commit: `feat(pouchdb): re-sync after emptyTrash`.

### Task 3.7: Per-mutation forced resync — `createFolder`

**Files:**
- Modify: `src/files/createFolder.ts`
- Test: `src/files/createFolder.test.ts`

**Steps:**

- [ ] After the successful create call:

  ```ts
  const created = await client.collection('io.cozy.files').createDirectory({ name, dirId })
  triggerPouchReplication(client, 'io.cozy.files')
  return created
  ```

- [ ] Test assertion.
- [ ] Commit: `feat(pouchdb): re-sync after createFolder`.

### Task 3.8: Per-mutation forced resync — `createCozyNote`

**Files:**
- Modify: `src/files/createCozyNote.ts`
- Test: `src/files/createCozyNote.test.ts`

**Steps:**

- [ ] After the successful note creation:

  ```ts
  const note = await client.create('io.cozy.notes', { /* ... */ })
  triggerPouchReplication(client, 'io.cozy.files')
  triggerPouchReplication(client, 'io.cozy.notes')
  return note
  ```

  > Two triggers because creating a note materializes both an `io.cozy.notes` doc AND an `io.cozy.files` entry that holds it.

- [ ] Test assertion (both doctypes).
- [ ] Commit: `feat(pouchdb): re-sync after createCozyNote`.

### Task 3.9: Per-mutation forced resync — `createOfficeFile`

**Files:**
- Modify: `src/files/createOfficeFile.ts`
- Test: `src/files/createOfficeFile.test.ts`

**Steps:**

- [ ] After the successful office-file creation:

  ```ts
  const file = await client.collection('io.cozy.files').createFile(/* ... */)
  triggerPouchReplication(client, 'io.cozy.files')
  return file
  ```

- [ ] Test assertion.
- [ ] Commit: `feat(pouchdb): re-sync after createOfficeFile`.

### Task 3.10: Per-mutation forced resync — sharing helpers

**Files:**
- Modify: `src/files/sharing.ts` (all exported sharing helpers — `addSharingRecipients`, `revokeSharingRecipient`, `revokeSharing`, `createSharingLink`, `revokeSharingLink`, etc. — name them once we read the file)
- Test: `src/files/sharing.test.ts`

**Steps:**

- [ ] For **every** exported helper in `src/files/sharing.ts` that mutates the stack, add after the successful call:

  ```ts
  triggerPouchReplication(client, 'io.cozy.sharings')
  triggerPouchReplication(client, 'io.cozy.permissions')
  ```

  > Both doctypes because sharing mutations touch `io.cozy.sharings` AND the underlying `io.cozy.permissions`.

- [ ] One test assertion per helper.
- [ ] Commit (single, all sharing helpers in one go): `feat(pouchdb): re-sync after sharing mutations`.

### Task 3.11: Verify periodic sync is wired through the PouchLink constructor

**Files:**
- Modify: `src/pouchdb/getLinks.test.ts` (the periodic-sync assertion added in Task 2.1 should already exist — this task makes the verification explicit and adds a manual smoke check)

> **Why this exists as its own task.** The `periodicSync: true` + `replicationInterval: 60_000` options were set in Task 2.1's implementation. This task is a checkpoint: the unit test must already assert the options are passed correctly, and a manual smoke must confirm the periodic tick fires on a real device. Without this verification we have no signal that the periodic sync is actually running — `cozy-pouch-link` swallows the option silently if the platform shim is malformed. Option name was confirmed against `node_modules/cozy-pouch-link/types/CozyPouchLink.d.ts` (`periodicSync: boolean` and `replicationInterval?: number`).

**Steps:**

- [ ] Confirm the unit test added at Task 2.1 (`'enables periodic sync with a 60 second interval'`) passes. If it was omitted, add it now:

  ```ts
  it('enables periodic sync with a 60 second interval', () => {
    getLinks()
    const opts = (PouchLink as unknown as jest.Mock).mock.calls[0][0]
    expect(opts.periodicSync).toBe(true)
    expect(opts.replicationInterval).toBe(60_000)
  })
  ```

- [ ] Manual smoke on a physical device: log in, leave the app open in the foreground, and trigger a remote change from another client (e.g. rename a file via the web UI). Within ~60 s the mobile list should reflect the change without any user interaction. If it doesn't, check Metro logs for `[PouchManager]` / `[startReplication]` debug lines at the expected cadence; suspect a bad shim wiring otherwise.
- [ ] Commit: `test(pouchdb): assert periodicSync + replicationInterval are passed to PouchLink`.

### Phase 3 gate

Manual iOS test:
1. Open app online → file list loads.
2. Airplane Mode ON, kill the app, relaunch → files visible (from cache).
3. Rename from mobile → list reflects immediately (optimistic update) AND within <2 s the local cache is resynced (visible if you kill + relaunch in airplane mode right after).
4. **Important:** rename a folder from another client (web) → the mobile list **does not refresh in real time** (no realtime backstop). It will refresh within ~60 s thanks to the periodic sync tick (Task 3.11), or sooner on the next mutation / pull-to-refresh / cold-start.

---

## Phase 4 — Online-only mutation guards (per-call-site)

> **Why this phase exists.** With Phase 3 in place, every successful mutation triggers a Pouch resync. But the mutation itself goes through StackLink, which fails opaquely (or hangs) when offline. We want to short-circuit at the **UI handler** level: if `useIsOnline()` returns false, show a snackbar via `drive.offline.requiresOnline` and never call the helper. **No offline queue** — mutations are dropped outright. Mirrors the "fail fast" rule the user re-stated in the amendment that motivated this phase.
>
> **Pattern.** Every task in this phase follows the exact same diff shape:
>
> ```tsx
> import { useIsOnline } from '@/network/useIsOnline'
> import { requireOnline } from '@/network/requireOnline'
> // ...
> const isOnline = useIsOnline()
> // ...
> const handleX = async (...) => {
>   if (!requireOnline(isOnline, setSnackbar, t)) return
>   // ... existing body
> }
> ```
>
> Tasks are scoped one-file-per-task so reviewers can audit coverage call-site by call-site. Tests assert the early-return-with-snackbar behavior using a `useIsOnline` mock returning `false`.

### Task 4.1: Guard mutations in `app/(drive)/files/[...path].tsx`

**Files:**
- Modify: `app/(drive)/files/[...path].tsx`
- Test: `app/(drive)/files/[...path].test.tsx` (or co-located test file — name matches existing convention)

> Covers: rename, delete (single + bulk), create folder, create note, create office file, share request. Six handlers in one file — they all share the same `isOnline` binding declared once at the top of the component.

**Steps:**

- [ ] Add a failing test that mocks `@/network/useIsOnline` to return `false`, fires each handler, and asserts: (a) the mutation helper (e.g. `renameEntry`) is **not** called, (b) `setSnackbar` is called with `drive.offline.requiresOnline`.
- [ ] Run test, verify failure.
- [ ] Add imports at the top of `app/(drive)/files/[...path].tsx` :

  ```tsx
  import { useIsOnline } from '@/network/useIsOnline'
  import { requireOnline } from '@/network/requireOnline'
  ```

- [ ] Inside the `FilesScreen` component, after the existing `const { t } = useTranslation()` (or near other hooks), add :

  ```tsx
  const isOnline = useIsOnline()
  ```

- [ ] Prepend the guard to each of the following handlers (the line right after the function opening `{`) :
  - `handleCreate` (createFolder)
  - `handleCreateOffice`
  - `handleCreateNote`
  - the rename submit handler (calling `renameEntry`)
  - the delete handler (calling `softDeleteEntry`)
  - the bulk delete handler
  - the share trigger (the `onPress` calling `shareRef.current?.present(...)`) — guard at the handler boundary, NOT inside `ShareSheet` itself (the sheet's own mutations are guarded in Task 4.4).

  Each prepended line is exactly :

  ```tsx
  if (!requireOnline(isOnline, setSnackbar, t)) return
  ```

  > For the share-request `onPress` (which is a sync handler that opens the sheet) — guard it too, since the user opening the sheet while offline only to be told "you're offline" is worse UX than a snackbar at tap time. This is the only call site in this task where the guarded code path is "open the sheet" rather than "call a stack helper".

- [ ] Run test, verify pass.
- [ ] Run `npm test -- app/\(drive\)/files` for the broader suite — no regressions.
- [ ] Commit: `feat(drive): block files-screen mutations when offline`.

### Task 4.2: Guard mutations in `app/(drive)/recent.tsx`

**Files:**
- Modify: `app/(drive)/recent.tsx`
- Test: `app/(drive)/recent.test.tsx` (co-located if convention matches)

> Covers: rename, delete (single), share request.

**Steps:**

- [ ] Failing test : mock `useIsOnline` → false, fire each handler, assert helper not called + snackbar set.
- [ ] Run test, verify failure.
- [ ] Add imports :

  ```tsx
  import { useIsOnline } from '@/network/useIsOnline'
  import { requireOnline } from '@/network/requireOnline'
  ```

- [ ] In the component, add `const isOnline = useIsOnline()` near the other hooks.
- [ ] Prepend `if (!requireOnline(isOnline, setSnackbar, t)) return` to each of :
  - the rename submit handler (calling `renameEntry`)
  - the delete handler (calling `softDeleteEntry`)
  - the share `onPress` that calls `shareRef.current?.present(...)`

- [ ] Run test, verify pass.
- [ ] Commit: `feat(drive): block recent-screen mutations when offline`.

### Task 4.3: Guard mutations in `app/(drive)/trash.tsx`

**Files:**
- Modify: `app/(drive)/trash.tsx`
- Test: `app/(drive)/trash.test.tsx` (co-located if convention matches)

> Covers: restore, empty trash. Both are destructive-ish — blocking them offline is non-negotiable, the local cache would diverge from server state otherwise.

**Steps:**

- [ ] Failing test : mock `useIsOnline` → false, fire `handleRestore` and `handleEmpty`, assert `restoreEntry`/`emptyTrash` are **not** called + snackbar set.
- [ ] Run test, verify failure.
- [ ] Add imports :

  ```tsx
  import { useIsOnline } from '@/network/useIsOnline'
  import { requireOnline } from '@/network/requireOnline'
  ```

- [ ] In the component, add `const isOnline = useIsOnline()`.
- [ ] Prepend `if (!requireOnline(isOnline, setSnackbar, t)) return` to :
  - `handleRestore`
  - `handleEmpty`

- [ ] Run test, verify pass.
- [ ] Commit: `feat(drive): block trash-screen mutations when offline`.

### Task 4.4: Guard mutations in `src/ui/ShareSheet.tsx`

**Files:**
- Modify: `src/ui/ShareSheet.tsx`
- Test: `src/ui/ShareSheet.test.tsx`

> Covers: create link (`onToggleLink(true)`), revoke link (`onToggleLink(false)`), swap link rights (`onChangeEditingRights` — revoke + create), add recipient / create sharing (`onSubmitRecipient`), revoke recipient (`onRemoveRecipient`). Five handlers in one file. The snackbar callback inside ShareSheet is the existing `setSnack` state setter (used for the "link copied" toast) — pass it as the `onOffline` callback so the message surfaces in the same UI affordance.

**Steps:**

- [ ] Failing test : for each handler, mock `useIsOnline` → false and assert no stack helper is called (`createPublicLink`, `revokePublicLink`, `addRecipient`, `createSharingForFile`, `revokeRecipientAtIndex`) and the snackbar contains the offline key.
- [ ] Run test, verify failure.
- [ ] Add imports at the top of `ShareSheet.tsx` :

  ```tsx
  import { useIsOnline } from '@/network/useIsOnline'
  import { requireOnline } from '@/network/requireOnline'
  ```

- [ ] In the `ShareSheet` component, near the other hooks (right after `useTranslation`), add :

  ```tsx
  const isOnline = useIsOnline()
  ```

- [ ] Prepend the guard line to each of these handlers, immediately after the opening `{` and before the existing early-return guards (so it fires first) :
  - `onToggleLink` → `if (!requireOnline(isOnline, setSnack, t)) return`
  - `onChangeEditingRights` → `if (!requireOnline(isOnline, setSnack, t)) return` (place it AFTER the `setEditingRights(next)` local-state update, since the local toggle should still echo even offline; place BEFORE the `if (!linkPermission ...)` branch so we don't perform the revoke-then-create swap)
  - `onSubmitRecipient` → `if (!requireOnline(isOnline, setSnack, t)) return`
  - `onRemoveRecipient` → `if (!requireOnline(isOnline, setSnack, t)) return`

  > `onCopyLink` is NOT guarded — clipboard copy is purely local and doesn't touch the stack.

- [ ] Run test, verify pass.
- [ ] Commit: `feat(share): block ShareSheet mutations when offline`.

### Phase 4 gate

Manual smoke (do this BEFORE moving to the UI banner phase) :

1. App online → all mutations work as before. No snackbar spam.
2. Enable Airplane Mode → tap rename / delete / create folder / restore / empty trash / share-anything. **Every** action must show `drive.offline.requiresOnline` in a snackbar and **must NOT** call the stack helper (verify by network logs — no outgoing request).
3. Disable Airplane Mode → same actions now succeed. Confirms the guard re-enables itself on reconnect (this is implicit in `useIsOnline`'s NetInfo subscription — but worth confirming once).

---

## Phase 5 — UI surface (banner + per-row toggle)

> **Strict v1 scope.** No large UI work here. Just make sync **visible** and let the user know when they are offline.

### Task 5.1: Offline banner

**Files:**
- Create: `src/ui/OfflineBanner.tsx`
- Test: `src/ui/OfflineBanner.test.tsx`

**Steps:**

- [ ] Test (rendering, depends on the useIsOnline hook):

  ```ts
  jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: false })
  }))
  // render OfflineBanner; expect the banner text (the fr translation of `offline.banner` for instance)
  ```

- [ ] Implementation:

  ```tsx
  import { useEffect, useState } from 'react'
  import { View, Text, StyleSheet } from 'react-native'
  import NetInfo from '@react-native-community/netinfo'
  import { useTranslation } from 'react-i18next'

  export const OfflineBanner = () => {
    const { t } = useTranslation()
    const [online, setOnline] = useState(true)
    useEffect(() => {
      NetInfo.fetch().then(s => setOnline(s.isConnected ?? true))
      const unsub = NetInfo.addEventListener(s => setOnline(s.isConnected ?? true))
      return () => unsub()
    }, [])
    if (online) return null
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>{t('offline.banner')}</Text>
      </View>
    )
  }

  const styles = StyleSheet.create({
    banner: { backgroundColor: '#f59e0b', paddingVertical: 6, paddingHorizontal: 12 },
    text: { color: '#fff', fontSize: 13, textAlign: 'center' }
  })
  ```

- [ ] Add i18n key `offline.banner`: "Vous êtes hors ligne — affichage du cache" / "Offline — showing cached data" in `src/i18n/locales/fr.json` + `en.json`.
- [ ] Mount `<OfflineBanner />` at the top of `app/(drive)/_layout.tsx` (under the header).
- [ ] Commit: `feat(ui): offline banner when network drops`.

### Task 5.2: Sync indicator (subtle)

**Files:**
- Create: `src/ui/SyncIndicator.tsx`
- Modify: `app/(drive)/_layout.tsx`

**Steps:**

- [ ] PouchLink emits `'sync:start'` / `'sync:end'` events on its internal emitter. Subscribe via the client:

  ```tsx
  import { useEffect, useState } from 'react'
  import { ActivityIndicator } from 'react-native-paper'
  import { useClient } from 'cozy-client'
  import { getPouchLink } from '@/pouchdb/triggerReplication'

  export const SyncIndicator = () => {
    const client = useClient()
    const [syncing, setSyncing] = useState(false)
    useEffect(() => {
      const pouch = getPouchLink(client)
      if (!pouch) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const link = pouch as any
      const onStart = () => setSyncing(true)
      const onEnd = () => setSyncing(false)
      link.on?.('sync:start', onStart)
      link.on?.('sync:end', onEnd)
      return () => {
        link.off?.('sync:start', onStart)
        link.off?.('sync:end', onEnd)
      }
    }, [client])
    if (!syncing) return null
    return <ActivityIndicator size={14} />
  }
  ```

  > Note: `cozy-pouch-link@60.x` may not expose these events directly on the link. **Validate against the package source** once installed. If the events are not exposed, fall back to a simple timer that flashes the indicator on every `triggerPouchReplication`.

- [ ] Mount it in the AppBar (to the right, near the avatar).
- [ ] Commit: `feat(ui): in-header sync indicator`.

### Phase 5 out-of-scope (reminder)

No per-row "available offline" toggle (all 5 doctypes are cached **all the time**). No file content (blob) download — that's a separate plan.

---

## Phase 6 — Jest mocks + smoke tests

### Task 6.1: Jest mocks for the pouch chain

**Files:**
- Modify: `jest.setup.ts`

**Steps:**

- [ ] Append to `jest.setup.ts`:

  ```ts
  jest.mock('@/pouchdb/pouchdb', () => ({ __esModule: true, default: {} }))

  jest.mock('@op-engineering/op-sqlite', () => ({}))
  jest.mock('react-native-quick-crypto', () => ({}))
  jest.mock('@craftzdog/react-native-buffer', () => ({}))
  jest.mock('@craftzdog/pouchdb-collate-react-native', () => ({}))
  jest.mock('readable-stream', () => ({}))
  jest.mock('react-native-mmkv', () => ({
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    }))
  }))
  jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true })
  }))

  class MockPouchLink {
    options: unknown
    constructor(options: unknown) {
      this.options = options
    }
    startReplication = jest.fn()
    startReplicationWithDebounce = jest.fn()
    reset = jest.fn().mockResolvedValue(undefined)
    on = jest.fn()
    off = jest.fn()
  }
  jest.mock('cozy-pouch-link', () => {
    return Object.assign(
      jest.fn().mockImplementation((opts: unknown) => new MockPouchLink(opts)),
      { default: jest.fn().mockImplementation((opts: unknown) => new MockPouchLink(opts)) }
    )
  })

  jest.mock('cozy-realtime', () => ({
    RealtimePlugin: jest.fn()
  }))
  ```

  > Layout mirrors `cozy-flagship-app/__tests__/jestSetupFile.js:126-137`. Difference: we stub `op-sqlite`, `quick-crypto`, etc. because they crash at require under Node (native modules).

- [ ] Run the full suite: `npm test`. Verify no tests are broken by the new mocks. If a test was asserting on mock behavior elsewhere, add `jest.unmock(...)` locally.
- [ ] Commit: `test: mock pouch chain in jest setup`.

### Task 6.2: Assertion test that pouchAdapter is RN-flavored

**Files:**
- Create: `src/pouchdb/platformReactNative.test.ts`

**Steps:**

- [ ] Test: prove we do **not** fall back to `pouchdb-browser`:

  ```ts
  jest.unmock('@/pouchdb/pouchdb') // need the real module to see its adapters list
  jest.mock('pouchdb-adapter-react-native-sqlite', () => ({
    __esModule: true,
    default: (PouchDB: any) => {
      PouchDB.adapter('react-native-sqlite', () => {}, true)
    }
  }))
  jest.mock('pouchdb-core', () => {
    const adapters: Record<string, unknown> = {}
    const mock = {
      plugin: jest.fn(function (this: any, p: any) {
        if (typeof p === 'function') p(mock)
        return mock
      }),
      adapter: jest.fn((name: string, impl: unknown) => {
        adapters[name] = impl
      }),
      __adapters: adapters
    }
    return mock
  })

  import { platformReactNative } from './platformReactNative'

  it('platformReactNative.pouchAdapter is the SQLite-enabled PouchDB, not pouchdb-browser', () => {
    expect(platformReactNative.pouchAdapter).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapters = (platformReactNative.pouchAdapter as any).__adapters
    expect(adapters['react-native-sqlite']).toBeDefined()
  })
  ```

  > **Why this test exists.** `cozy-pouch-link` has a hidden fallback to `pouchdb-browser` if `platform.pouchAdapter` is undefined. Browsing doesn't crash at construction time — it crashes much later at `_putLocal()`. This test pins the contract and would fail loud if a refactor accidentally drops the `pouchAdapter` field.

- [ ] Commit: `test(pouchdb): assert RN-flavored adapter is wired, not pouchdb-browser`.

### Task 6.3: getLinks integration smoke

**Files:**
- Modify: `src/pouchdb/getLinks.test.ts`

**Steps:**

- [ ] Add a partial "no-mock" test: without mocking `cozy-pouch-link`, instantiate it for real and assert on the `options` it receives. (Skippable if we keep the full mock — we've already tested the 4 key properties in 2.1.)
- [ ] Commit: `test(pouchdb): expand getLinks coverage`.

### Task 6.4: Manual iOS smoke checklist

**Files:**
- Create: `docs/superpowers/checklists/2026-05-11-offline-smoke.md`

> Do not create a README.md, but this checklist is genuinely useful and the user wrote "manual iOS/Android smoke checklist" — either create a checklist file in the checklists folder if it exists, or **inside the plan itself** (below). We pick the second option here: the checklist lives inline.

**Smoke checklist iOS (run on a physical device after Phase 5):**

- [ ] Cold start, online → `app/(drive)/files/[...path]` loads root folder in <2s.
- [ ] Force-kill app, enable Airplane Mode, relaunch → root folder visible from cache, OfflineBanner displayed.
- [ ] Disable Airplane → banner disappears within 3s (NetInfo event).
- [ ] Tap into a subfolder → loads.
- [ ] Tap into a subfolder you've never opened while online while still offline → currently UX is "empty state". Document this (out of scope: prefetch on online).
- [ ] Rename a file → list reflects new name immediately, peer web client sees the change. Mobile cache is resynced via the per-mutation `triggerPouchReplication` call (see Phase 3).
- [ ] From web, rename another file → **mobile list does NOT auto-refresh** (no realtime backstop, by design). Pull-to-refresh OR cold-start triggers a fresh sync.
- [ ] Logout → SQLite DB file deleted (verify via Xcode device file browser at `Documents/<dbname>.db`).
- [ ] Re-login → fresh sync, no leak from previous account.

**Smoke checklist Android (essential — not exhaustive):**

- [ ] Cold start online + offline same as iOS items 1-3.
- [ ] No native crash in `adb logcat | grep -i 'op-sqlite\|quick-crypto'`.

---

## Cleanup / nice-to-haves (post-merge)

- [ ] Telemetry: log sync duration + success/fail to Sentry (when Sentry is added).
- [ ] Consider migrating the storage shim away from MMKV to AsyncStorage if MMKV proves flaky on New Arch + Expo SDK 54 — fallback path documented here because MMKV is known to have sporadic crashes on some low-end Android devices.
- [ ] Re-evaluate disabling New Arch if a critical native lib turns out incompatible (see Amendments — there is no plan task for this today, but the change is small: `newArchEnabled=false` in `app.json`, `android/gradle.properties`, and `ios/Podfile.properties.json` regenerated via `npx expo prebuild --clean`).
- [ ] If the "no-realtime" trade-off bites users (web-driven changes invisible for up to ~60 s due to periodic sync), consider tightening `replicationInterval` to 30 s or reintroducing a realtime backstop as a follow-up plan — keep both OUT of v1 per user directive.

## Out of scope (for the record)

- Blob caching (downloading file contents for offline open). Separate plan.
- Conflict resolution: impossible with `fromRemote` only.
- Background sync via `react-native-background-fetch` / iOS BGTaskScheduler. v1 syncs only while the app is in the foreground.
- Encryption-at-rest for SQLite. Possible via `op-sqlite`'s SQLCipher build flag, but out of v1.

---

## Commit recap (target ~35)

1. `chore(deps): install pouchdb + cozy-pouch-link + native shims`
2. `chore(babel): add crypto/stream/buffer/pouchdb-collate aliases for RN`
3. `chore(native): prebuild + pod install with pouch native deps`
4. `feat(pouchdb): add core PouchDB instance with SQLite adapter`
5. `feat(pouchdb): add MMKV-backed storage shim`
6. `feat(pouchdb): add AppState event bridge`
7. `feat(pouchdb): add NetInfo event bridge`
8. `feat(pouchdb): add isOnline helper`
9. `feat(pouchdb): wire AppState+NetInfo into the pouch event emitter`
10. `feat(pouchdb): export platformReactNative aggregator`
11. `feat(network): add useIsOnline hook for UI gating`
12. `feat(network): add requireOnline guard helper`
13. `feat(i18n): add drive.offline.requiresOnline in en + fr`
14. `feat(pouchdb): add getLinks with PouchLink + StackLink chain`
15. `feat(client): inject pouch link chain and call client.login()`
16. `refactor(auth): await async createClient at both bootstrap and login`
17. `feat(pouchdb): add triggerPouchReplication helper`
18. `feat(client): kick off initial pouch sync after login`
19. `feat(pouchdb): re-sync after renameEntry`
20. `feat(pouchdb): re-sync after softDeleteEntry`
21. `feat(pouchdb): re-sync after restoreEntry`
22. `feat(pouchdb): re-sync after emptyTrash`
23. `feat(pouchdb): re-sync after createFolder`
24. `feat(pouchdb): re-sync after createCozyNote`
25. `feat(pouchdb): re-sync after createOfficeFile`
26. `feat(pouchdb): re-sync after sharing mutations`
27. `test(pouchdb): assert periodicSync + replicationInterval are passed to PouchLink`
28. `feat(drive): block files-screen mutations when offline`
29. `feat(drive): block recent-screen mutations when offline`
30. `feat(drive): block trash-screen mutations when offline`
31. `feat(share): block ShareSheet mutations when offline`
32. `feat(ui): offline banner when network drops`
33. `feat(ui): in-header sync indicator`
34. `test: mock pouch chain in jest setup`
35. `test(pouchdb): assert RN-flavored adapter is wired, not pouchdb-browser`

---

## Amendments (2026-05-11)

This plan was amended after first review. Summary of changes vs. the original draft, with the user's exact directives cited:

1. **Keep React Native New Architecture ENABLED.** (User: "Keep React Native New Architecture ENABLED. The current plan disables it in Phase 0. The user accepts the risk. Remove the 'disable New Arch' task entirely.")
   - Removed Task 0.1 ("Disable New Architecture") entirely.
   - Removed the `chore(arch): disable New Architecture` commit from the recap (was #1).
   - Phase 0 renumbered: 0.2→0.1, 0.3→0.2, 0.4→0.3.
   - Replaced the previous rationale with a short note that we keep the New Architecture enabled (Expo SDK 54 default) and accept the small additional integration risk on `react-native-quick-crypto@0.7.x`, `pouchdb-adapter-react-native-sqlite@4.x`, `@op-engineering/op-sqlite@15.x`.
   - Added a fallback note in the post-merge cleanup section in case the risk materializes (3-file flip — small enough to defer).
   - Phase 0 gate now mentions verifying boot with New Arch ON.

2. **Removed the offline feature flag entirely.** (User: "Remove the offline feature flag entirely. The user does not want this — offline cache should always be ON.")
   - Deleted the entire former Phase 3 ("Doctype replication options + feature flag"). Both Task 3.1 (`isOfflineEnabled.ts`) and Task 3.2 (cached `offline.enabled` via SecureStore + `getLinks` flag gate) are gone.
   - `getLinks()` (Phase 2) was already unconditional in the original draft — kept as-is, no flag check. Cleared the architecture sentence in the header to make this explicit.
   - Removed the related commits from the recap (`feat(pouchdb): add offline.enabled flag helper`, `feat(pouchdb): gate PouchLink behind cached offline.enabled flag`).
   - No more SecureStore usage anywhere for this concern.

3. **Removed the realtime-driven sync hook.** (User: "Remove realtime-driven sync hook ... Remove the hook entirely along with any mount points.")
   - Deleted the former Task 4.3 (`useOfflineReplicationOnRealtime.ts`) and its mount in `app/(drive)/_layout.tsx`.
   - Removed the corresponding commit `feat(pouchdb): replicate from remote on realtime events`.
   - Updated the iOS smoke checklist: the "from web, rename another file → mobile reflects within 3 s" item is now an **expected non-refresh** check (no auto-sync from peer client; mobile must pull-to-refresh or cold-start — see amendment 6 below for the periodic-sync follow-up that softens this).
   - Phase 3 gate updated to call out the trade-off explicitly.

4. **Strengthened per-mutation forced resync.** (User: "every mutation helper (renameEntry, softDeleteEntry, restoreEntry, emptyTrash, createFolder, createCozyNote, createOfficeFile, all sharing helpers) should explicitly call triggerPouchReplication(client, doctype) ... the ONLY sync trigger after the initial post-login sync.")
   - Former Task 4.4 (single bundled commit covering all mutations) was split into **8 explicit tasks** (3.3 through 3.10), one per mutation site, each with its own commit. Each task shows the actual code change for the call site and names the test file. Mirrors the per-mutation granularity of PR #2.
   - Updated the `triggerPouchReplication` signature to `(client, doctype?, { immediate? })` so mutation sites can pass `triggerPouchReplication(client, 'io.cozy.files')` directly. Doctype is informational for v1 (link replicates all configured doctypes) but the signature is locked for future per-doctype specialization.
   - Updated the initial-sync call in `createClient` to use the new signature: `triggerPouchReplication(client, undefined, { immediate: true })`.

5. **Added online-only mutation guards (no offline queue).** (User: "prevent all mutations when the app is offline — no offline queue, just block them outright" — guards run BEFORE the per-mutation resync, returning early with a snackbar.)
   - Added Task 1.8 `useIsOnline` (reactive hook over `NetInfo.fetch` + `addEventListener`, returns `state.isConnected && state.isInternetReachable !== false`). No new deps — `@react-native-community/netinfo` was already installed in Phase 0.
   - Added Task 1.9 `requireOnline(isOnline, onOffline, t)` — pure function returning a boolean; on offline it calls `onOffline(t('drive.offline.requiresOnline'))`. Call-site idiom: `if (!requireOnline(isOnline, setSnackbar, t)) return`.
   - Added Task 1.10 i18n keys `drive.offline.requiresOnline` in en (`"Available when you're back online"`) and fr (`"Disponible quand vous serez en ligne"`).
   - Inserted a brand-new **Phase 4** (online-only mutation guards) with one task per call site: Task 4.1 (`files/[...path].tsx` — rename, delete, bulk delete, create folder/note/office, share-request), Task 4.2 (`recent.tsx` — rename, delete, share-request), Task 4.3 (`trash.tsx` — restore, empty), Task 4.4 (`ShareSheet.tsx` — toggle link, swap rights, add recipient/create sharing, remove recipient). `onCopyLink` is intentionally NOT guarded (clipboard-only). The old Phase 4 (UI surface) and old Phase 5 (jest + smoke) shifted to Phase 5 and Phase 6 respectively. Recap commits 11-13 (network/i18n helpers) and 28-31 (per-call-site guards) are new.
   - **No offline queue.** Blocked mutations are dropped outright — the user retries them when back online. This is the only correct choice given the `fromRemote`-only replication strategy (no conflict resolution path exists for queued local writes).

6. **Added periodic background sync.** (User: "I now want periodic sync in addition. cozy-pouch-link supports `periodicSync: true` in its constructor options.")
   - Updated Phase 2 / Task 2.1 (`getLinks.ts`) to pass `periodicSync: true` and `replicationInterval: 60_000` to the `PouchLink` constructor. Option names verified against `node_modules/cozy-pouch-link/types/CozyPouchLink.d.ts` — the interval option is named `replicationInterval` (not `periodicSyncInterval`), and the default interval cozy-pouch-link ships with is 30 s.
   - We pick 60 s rather than 30 s: drive metadata doesn't move fast enough to justify polling twice a minute, and a 60 s tick saves roughly half the radio wake-ups vs. the default.
   - Added Task 3.11 (verify periodic sync wiring) — unit-test assertion on the constructor options plus a manual smoke that triggers a remote change and confirms the mobile UI updates within ~60 s without any local interaction.
   - Updated the Architecture overview at the top of the plan to list periodic sync alongside cold-start and per-mutation triggers.
   - Updated Phase 3 header note: sync triggers are now (a) initial post-login, (b) periodic every 60 s, (c) per-mutation. The phase 3 gate item about "from web, rename another file → mobile does NOT auto-refresh" is now softened: it will refresh within ~60 s thanks to the periodic tick.
   - Added one entry to the commit recap (`test(pouchdb): assert periodicSync + replicationInterval are passed to PouchLink`).

**Reorganization summary.** Original 7 phases (0-6) became 6 phases (0-5), then re-expanded to 7 phases (0-6) when the online-only guards earned their own phase:
- Phase 0 (native deps + babel) — minus the New Arch toggle task.
- Phase 1 (PouchDB instance + shims + `useIsOnline` + `requireOnline` + i18n) — expanded with Tasks 1.8/1.9/1.10.
- Phase 2 (link wiring) — unchanged structurally; the `PouchLink` constructor now sets `periodicSync: true` + `replicationInterval: 60_000`.
- Phase 3 (sync triggers) — consolidates the old Phase 4's helper + initial-sync, dropping the realtime hook and expanding mutations to 8 explicit tasks plus a new Task 3.11 verifying the periodic-sync wiring. The original Phase 3 (feature flag) is gone.
- Phase 4 (online-only mutation guards) — **new**, one task per UI file with mutation entry points.
- Phase 5 (UI surface) — was Phase 4 in the previous revision.
- Phase 6 (jest + smoke) — was Phase 5 in the previous revision.

Commit count went from ~22 (original) → ~27 (previous revision) → ~34 (after online-only guards) → ~35 (after adding the periodic-sync verification commit).
