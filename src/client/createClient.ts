import CozyClient, { StackLink } from 'cozy-client'
import flag from 'cozy-flags'
import CozyPouchLink from 'cozy-pouch-link'

import { Session } from '@/auth/types'

import { pouchPlatform } from './pouchPlatform'

// Singleton: instantiated once at module load. SyncProvider imports this
// to drive the replication lifecycle (start/stop/syncImmediately).
//
// strategy: 'fromRemote' on both doctypes means cozy-pouch-link only
// replicates pulls from cozy-stack; it forwards every mutation to the
// next link (StackLink) instead of trying to apply it locally. This is
// required because cozy-stack rejects io.cozy.files writes coming from
// the pouch/couch replication channel.
export const pouchLink = new CozyPouchLink({
  doctypes: ['io.cozy.files', 'io.cozy.sharings'],
  doctypesReplicationOptions: {
    'io.cozy.files': { strategy: 'fromRemote' },
    'io.cozy.sharings': { strategy: 'fromRemote' }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platform: pouchPlatform as any,
  // Replicate periodically (30s loop in cozy-pouch-link).
  periodicSync: true,
  // Do not start replication immediately — queries fall through to
  // StackLink while Pouch is empty during the first sync.
  initialSync: false,
  // strategy: 'fromRemote' on both doctypes forwards writes to StackLink.
  isReadOnly: true
})

export const createClient = (session: Session): CozyClient => {
  console.log(
    '[createClient] uri',
    session.uri,
    'clientID',
    session.oauthOptions.clientID,
    'tokenLen',
    session.token.accessToken?.length ?? 0
  )
  const client = new CozyClient({
    uri: session.uri,
    oauth: { ...session.oauthOptions, token: session.token },
    scope: ['*'],
    appMetadata: {
      slug: 'twake-drive-mobile',
      version: '0.1.0'
    },
    // CozyPouchLink first → serves replicated doctype reads from SQLite
    // and forwards everything else (mutations + non-replicated doctypes)
    // to StackLink. cozy-client v60 does NOT auto-append a StackLink when
    // `links` is provided, so we add it explicitly.
    links: [pouchLink, new StackLink()]
  })
  void client.registerPlugin(flag.plugin, null)
  // NOTE: we deliberately do NOT call `client.login()` here.
  //
  // Calling it would fire `link.onLogin()` on every link — which the
  // offline cache (CozyPouchLink) needs to initialise its PouchManager
  // and open the local SQLite. BUT pouchdb-browser has no working
  // adapter on React Native (no IndexedDB, no native WebSQL) and the
  // initialisation crashes with `Invalid Adapter: undefined` and
  // `no such table: by-sequence`.
  //
  // The proper RN setup requires `pouchdb-adapter-react-native-sqlite`
  // + `react-native-quick-crypto` + babel module-resolver aliases for
  // crypto/stream/buffer (see the adapter's README). Until that's in
  // place, leaving onLogin un-triggered keeps CozyPouchLink dormant —
  // every read falls through to StackLink, the app behaves as if the
  // cache wasn't installed at all, and no adapter errors are thrown.
  // The trash query in particular ends up authoritative because every
  // fetch hits the stack.
  return client
}
