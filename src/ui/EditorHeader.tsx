import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar } from 'react-native-paper'
import { TwakeLogo } from '@/ui/icons/TwakeLogo'

interface Props {
  title: string
  onBack: () => void
}

/** Header for full-screen editor routes: a back action to return to the drive,
 *  the Twake logo, and the document title. Paper's Appbar.Header applies the
 *  device status-bar inset, so the phone clock/icons stay visible above it. */
export const EditorHeader = ({ title, onBack }: Props): React.ReactElement => (
  <Appbar.Header>
    <Appbar.BackAction onPress={onBack} />
    <View style={styles.logo}>
      <TwakeLogo size={28} />
    </View>
    <Appbar.Content title={title} />
  </Appbar.Header>
)

const styles = StyleSheet.create({
  logo: { marginLeft: 4, marginRight: 4, justifyContent: 'center' }
})
