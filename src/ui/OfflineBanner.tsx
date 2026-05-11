import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useIsOnline } from '@/network/useIsOnline'

export const OfflineBanner = (): React.ReactElement | null => {
  const { t } = useTranslation()
  const online = useIsOnline()
  if (online) return null
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t('drive.offline.banner')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#f59e0b', paddingVertical: 6, paddingHorizontal: 12 },
  text: { color: '#fff', fontSize: 13, textAlign: 'center' }
})
