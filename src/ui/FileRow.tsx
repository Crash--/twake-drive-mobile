import React from 'react'
import { StyleSheet } from 'react-native'
import { List, useTheme } from 'react-native-paper'
import { formatDistanceToNow } from 'date-fns'

import { formatFileSize } from '@/utils/formatters'
import { getFileIcon } from '@/utils/fileIcons'

export interface FileItem {
  _id: string
  name: string
  size: number | null
  mime?: string
  updated_at?: string
}

interface Props {
  file: FileItem
  onPress: (file: FileItem) => void
}

export const FileRow = ({ file, onPress }: Props) => {
  const theme = useTheme()
  const icon = getFileIcon('file', file.mime)
  const size = formatFileSize(file.size)
  const date = file.updated_at
    ? formatDistanceToNow(new Date(file.updated_at), { addSuffix: true })
    : ''
  const description = date ? `${size} · ${date}` : size

  return (
    <List.Item
      title={file.name}
      description={description}
      left={props => <List.Icon {...props} icon={icon} color={theme.colors.onSurfaceVariant} />}
      onPress={() => onPress(file)}
      style={styles.row}
    />
  )
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4 }
})
