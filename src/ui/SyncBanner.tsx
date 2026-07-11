import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ProgressBar, useTheme } from 'react-native-paper'
import { useClient } from 'cozy-client'

import { clientEmitter } from '@/client/cozyClientInternals'

export const SyncBanner = (): React.ReactElement | null => {
  const client = useClient()
  const theme = useTheme()
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!client) return
    const c = clientEmitter(client)
    const onStart = (): void => setSyncing(true)
    const onEnd = (): void => setSyncing(false)
    c.on('pouchlink:sync:start', onStart)
    c.on('pouchlink:sync:end', onEnd)
    c.on('pouchlink:sync:stop', onEnd)
    return () => {
      c.removeListener('pouchlink:sync:start', onStart)
      c.removeListener('pouchlink:sync:end', onEnd)
      c.removeListener('pouchlink:sync:stop', onEnd)
    }
  }, [client])

  if (!syncing) return null

  return (
    <View style={styles.wrap} pointerEvents="none">
      <ProgressBar indeterminate color={theme.colors.primary} style={styles.bar} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  bar: {
    height: 3
  }
})
