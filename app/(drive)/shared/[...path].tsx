import React, { useMemo, useRef } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { List, useTheme } from 'react-native-paper'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from 'cozy-client'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { Breadcrumb, BreadcrumbSegment } from '@/ui/Breadcrumb'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'
import { FileRow } from '@/ui/FileRow'
import { FolderRow } from '@/ui/FolderRow'
import { FileMetadataSheet, FileMetadataSheetHandle } from '@/ui/FileMetadataSheet'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessageKey } from '@/utils/errorMessages'
import {
  fileByIdQuery,
  fileByIdQueryAs,
  folderContentsQuery,
  folderContentsQueryAs,
  sharedWithMeQuery,
  sharedWithMeQueryAs,
  FileQueryResult,
  SharingQueryResult
} from '@/client/queries'

interface SharingRowItem {
  _id: string
  name: string
  fileId: string
}

const sharingToRow = (sharing: SharingQueryResult): SharingRowItem | null => {
  const rule = sharing.attributes?.rules?.[0]
  const fileId = rule?.values?.[0]
  if (!fileId) return null
  const name = rule?.title ?? sharing.attributes?.description ?? fileId
  return { _id: sharing._id, name, fileId }
}

export default function SharedScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const params = useLocalSearchParams<{ path?: string[] }>()
  const path = params.path as string[] | undefined
  const sheetRef = useRef<FileMetadataSheetHandle>(null)

  const isRoot = !path || path.length === 0

  const segments = useMemo<BreadcrumbSegment[]>(() => {
    const list: BreadcrumbSegment[] = [{ id: 'root', name: t('drive.shared') }]
    if (path) for (const id of path) list.push({ id })
    return list
  }, [path, t])

  const currentDirId = isRoot ? null : path[path.length - 1]

  const query = useQuery(
    isRoot ? sharedWithMeQuery() : folderContentsQuery(currentDirId as string),
    { as: isRoot ? sharedWithMeQueryAs : folderContentsQueryAs(currentDirId as string) }
  )

  const currentDirLookup = useQuery(fileByIdQuery((currentDirId ?? '') as string), {
    as: fileByIdQueryAs((currentDirId ?? '') as string),
    enabled: !isRoot
  })
  const currentDirName = isRoot
    ? t('drive.shared')
    : ((currentDirLookup.data as { name?: string } | null | undefined)?.name ?? '')

  const onSegmentPress = (index: number) => {
    if (index === 0) router.dismissAll()
    else router.dismissTo(`/(drive)/shared/${path?.slice(0, index).join('/')}`)
  }

  const renderFileItem = ({ item }: { item: FileQueryResult }) => {
    if (item.type === 'directory') {
      return (
        <FolderRow
          folder={item}
          onPress={folder =>
            router.push(`/(drive)/shared/${[...(path ?? []), folder._id].join('/')}`)
          }
        />
      )
    }
    return (
      <FileRow
        file={{ ...item, size: item.size ?? null }}
        onPress={file =>
          sheetRef.current?.present({
            ...file,
            cozyMetadata: item.cozyMetadata,
            path: item.path
          })
        }
      />
    )
  }

  const renderSharingItem = ({ item }: { item: SharingRowItem }) => (
    <List.Item
      title={item.name}
      left={props => (
        <List.Icon {...props} icon="folder-account" color={theme.colors.primary} />
      )}
      right={props => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => router.push(`/(drive)/shared/${item.fileId}`)}
      style={styles.row}
    />
  )

  const sharings: SharingRowItem[] = isRoot
    ? (((query.data as SharingQueryResult[] | null | undefined) ?? [])
        .map(sharingToRow)
        .filter((row): row is SharingRowItem => row !== null))
    : []

  const files = (!isRoot
    ? ((query.data as FileQueryResult[] | null | undefined) ?? [])
    : []) as FileQueryResult[]

  const isEmpty = isRoot ? sharings.length === 0 : files.length === 0
  const hasNothingYet = isRoot
    ? !query.data || (query.data as unknown[]).length === 0
    : files.length === 0

  return (
    <View style={styles.container}>
      <AppBar
        title={currentDirName}
        onBack={isRoot ? undefined : () => router.back()}
        onLogout={isRoot ? logout : undefined}
      />
      {!isRoot ? <Breadcrumb segments={segments} onSegmentPress={onSegmentPress} /> : null}
      {query.fetchStatus === 'loading' && hasNothingYet ? (
        <LoadingState />
      ) : query.fetchStatus === 'failed' ? (
        <ErrorState
          message={t(getErrorMessageKey(query.lastError))}
          onRetry={() => query.fetch()}
        />
      ) : isEmpty ? (
        <EmptyState message={t('drive.emptyShared')} />
      ) : isRoot ? (
        <FlatList
          data={sharings}
          keyExtractor={item => item._id}
          renderItem={renderSharingItem}
          refreshControl={
            <RefreshControl
              refreshing={query.fetchStatus === 'loading'}
              onRefresh={() => query.fetch()}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => query.fetchMore?.()}
        />
      ) : (
        <FlatList
          data={files}
          keyExtractor={item => item._id}
          renderItem={renderFileItem}
          refreshControl={
            <RefreshControl
              refreshing={query.fetchStatus === 'loading'}
              onRefresh={() => query.fetch()}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => query.fetchMore?.()}
        />
      )}
      <FileMetadataSheet ref={sheetRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { paddingVertical: 4 }
})
