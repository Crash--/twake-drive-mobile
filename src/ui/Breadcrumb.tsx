import React, { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Icon, Menu, Text, useTheme } from 'react-native-paper'
import { useQuery } from 'cozy-client'

import { fileByIdQuery, fileByIdQueryAs } from '@/client/queries'

export interface BreadcrumbSegment {
  id: string
  name?: string
}

interface Props {
  segments: BreadcrumbSegment[]
  onSegmentPress: (index: number) => void
}

/**
 * Mobile breadcrumb modeled after twake-drive web's MobileBreadcrumb:
 * shows only the CURRENT folder name with a chevron-down indicator when
 * there are parent folders to navigate back to. Tapping opens a dropdown
 * listing parent segments, each tappable.
 *
 * The component is rendered for any non-empty segments list. The dropdown
 * is only enabled when segments.length >= 2.
 */
export const Breadcrumb = ({ segments, onSegmentPress }: Props) => {
  const theme = useTheme()
  const [menuVisible, setMenuVisible] = useState(false)

  if (segments.length === 0) return null

  const currentIndex = segments.length - 1
  const current = segments[currentIndex]
  const parents = segments.slice(0, currentIndex)
  const hasParents = parents.length > 0

  const onPressTitle = () => {
    if (hasParents) setMenuVisible(true)
  }

  const onPressParent = (index: number) => {
    setMenuVisible(false)
    onSegmentPress(index)
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Pressable
            onPress={onPressTitle}
            disabled={!hasParents}
            accessibilityRole="button"
            style={styles.titleRow}
          >
            <BreadcrumbTitle segment={current} color={theme.colors.onSurface} />
            {hasParents ? (
              <View style={styles.chevron}>
                <Icon source="chevron-down" size={20} color={theme.colors.onSurface} />
              </View>
            ) : null}
          </Pressable>
        }
      >
        {parents.map((segment, index) => (
          <BreadcrumbMenuItem
            key={segment.id}
            segment={segment}
            onPress={() => onPressParent(index)}
          />
        ))}
      </Menu>
    </View>
  )
}

interface TitleProps {
  segment: BreadcrumbSegment
  color: string
}

const BreadcrumbTitle = ({ segment, color }: TitleProps) => {
  const lookup = useQuery(fileByIdQuery(segment.id), {
    as: fileByIdQueryAs(segment.id),
    enabled: !segment.name
  })
  const fetchedName = (lookup.data as { name?: string } | null | undefined)?.name ?? null
  const name = segment.name ?? fetchedName ?? ''

  return (
    <Text variant="titleMedium" style={[styles.title, { color }]} numberOfLines={1}>
      {name}
    </Text>
  )
}

interface MenuItemProps {
  segment: BreadcrumbSegment
  onPress: () => void
}

const BreadcrumbMenuItem = ({ segment, onPress }: MenuItemProps) => {
  const lookup = useQuery(fileByIdQuery(segment.id), {
    as: fileByIdQueryAs(segment.id),
    enabled: !segment.name
  })
  const fetchedName = (lookup.data as { name?: string } | null | undefined)?.name ?? null
  const name = segment.name ?? fetchedName ?? segment.id

  return <Menu.Item onPress={onPress} title={name} />
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '600' },
  chevron: { marginLeft: 4 }
})
