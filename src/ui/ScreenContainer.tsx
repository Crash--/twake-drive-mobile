import React from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Props {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /**
   * Pad the top by the device status-bar inset. Drive screens get this from
   * their AppBar/tab chrome, but full-screen routes (the editor WebViews) draw
   * edge-to-edge and would otherwise render under the status bar — set this so
   * the phone's clock/icons stay visible above the editor.
   */
  safeTop?: boolean
}

/**
 * Common flex-1 wrapper that paints the active Paper theme's background.
 * Used by every drive screen so dark mode looks consistent — without it
 * screens that don't explicitly set a backgroundColor end up with whatever
 * the parent (Tabs sceneStyle) supplies, which has been flaky.
 */
export const ScreenContainer = ({ children, style, safeTop }: Props): React.ReactElement => {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.colors.background, paddingTop: safeTop ? insets.top : 0 },
        style
      ]}
    >
      {children}
    </View>
  )
}
