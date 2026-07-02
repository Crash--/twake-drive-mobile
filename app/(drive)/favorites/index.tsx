import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { ScreenContainer } from '@/ui/ScreenContainer'
import { useAuth } from '@/auth/useAuth'

export default function FavoritesScreen() {
  const { t } = useTranslation()
  const { logout } = useAuth()

  return (
    <ScreenContainer>
      <AppBar title={t('drive.favorites')} onLogout={logout} />
      <View />
    </ScreenContainer>
  )
}
