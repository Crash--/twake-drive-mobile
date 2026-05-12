import React, { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native-paper'
import { useClient } from 'cozy-client'

import { getPouchLink } from '@/pouchdb/triggerReplication'

/**
 * Subtle spinner that appears while a Pouch replication is in flight.
 *
 * Reads `sync:start` / `sync:end` events from the PouchLink instance. These
 * event names are not part of cozy-pouch-link's documented public API —
 * they exist on the internal EventEmitter at the time of writing (v60.x,
 * CozyPouchLink.js) but could be renamed or removed.
 *
 * TODO(upstream): once cozy-pouch-link ships an official sync-state hook
 * (tracked in https://github.com/linagora/cozy-client — search "sync
 * indicator" / "sync events" in the issue list), switch to it and drop
 * the optional-chaining + `as any` cast below.
 *
 * If the upstream events disappear, this component silently falls back to
 * never showing the spinner (no error, no crash).
 */
export const SyncIndicator = (): React.ReactElement | null => {
  const client = useClient()
  const [syncing, setSyncing] = useState(false)
  useEffect(() => {
    const pouch = getPouchLink(client ?? undefined)
    if (!pouch) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const link = pouch as any
    const onStart = (): void => setSyncing(true)
    const onEnd = (): void => setSyncing(false)
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
