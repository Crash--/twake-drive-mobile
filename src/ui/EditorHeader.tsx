import React from 'react'
import { Platform, StatusBar } from 'react-native'
import { Appbar, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { CozyIcon } from '@/ui/icons/CozyIcon'

interface Props {
  onBack: () => void
}

/** Minimal, flat header for full-screen editor routes: just a back action to
 *  return to the native drive app. Every web editor (Notes, OnlyOffice, La Suite
 *  Docs) already renders its OWN bar with a logo, the document title and its
 *  actions, so this native bar is kept as slim as possible — no redundant Twake
 *  logo and no elevation shadow — to avoid a cluttered, cramped double header. */
export const EditorHeader = ({ onBack }: Props): React.ReactElement => {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const theme = useTheme()
  const topInset = Platform.OS === 'ios' ? 0 : insets.top || StatusBar.currentHeight || 0
  return (
    <Appbar.Header statusBarHeight={topInset} elevated={false} mode="small">
      <Appbar.Action
        isLeading
        animated={false}
        icon={p => <CozyIcon name="previous" size={p?.size ?? 24} color={theme.colors.onSurface} />}
        onPress={onBack}
        accessibilityLabel={t('common.back')}
      />
    </Appbar.Header>
  )
}
