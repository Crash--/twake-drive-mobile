import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function WelcomeScreen() {
  const { t } = useTranslation()
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineLarge" style={styles.title}>
            {t('auth.welcomeTitle')}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('auth.welcomeSubtitle')}
          </Text>
        </View>
        <Button mode="contained" onPress={() => router.push('/(auth)/login')}>
          {t('auth.loginCta')}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' }
})
