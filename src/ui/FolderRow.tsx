import React from 'react'
import { StyleSheet, View } from 'react-native'
import { List } from 'react-native-paper'

import { FileTypeIcon } from '@/ui/icons/FileTypeIcon'

export interface FolderItem {
  _id: string
  name: string
}

interface Props {
  folder: FolderItem
  onPress: (folder: FolderItem) => void
}

export const FolderRow = ({ folder, onPress }: Props) => {
  return (
    <List.Item
      title={folder.name}
      // Honour the `style` Paper passes to `left` so the folder icon aligns
      // with file thumbnails in the same list (matching column widths).
      left={props => (
        <View style={[props.style, styles.leftSlot]}>
          <FileTypeIcon icon="folder" size={40} />
        </View>
      )}
      right={props => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => onPress(folder)}
      style={styles.row}
    />
  )
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4 },
  leftSlot: { justifyContent: 'center', alignItems: 'center', width: 40, height: 40 }
})
