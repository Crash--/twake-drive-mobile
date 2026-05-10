import CozyClient from 'cozy-client'
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
    links: [pouchLink]
  })
  void client.registerPlugin(flag.plugin, null)
  return client
}
