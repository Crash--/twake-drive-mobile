import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useClient, useQuery } from 'cozy-client'
import { useTranslation } from 'react-i18next'
import { Image } from 'expo-image'
import Pdf from 'react-native-pdf'
import { VideoView, useVideoPlayer } from 'expo-video'
import { AudioModule, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { ActivityIndicator, IconButton, ProgressBar, useTheme } from 'react-native-paper'

import { AppBar } from '@/ui/AppBar'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'
import { fileByIdQuery, fileByIdQueryAs, FileQueryResult } from '@/client/queries'
import {
  buildFileStreamSource,
  buildThumbnailUrl,
  getPreviewKind,
  StreamSource
} from '@/files/streamUrl'
import { openFileNatively } from '@/files/openFile'
import { OfflineFilesStore } from '@/offline/OfflineFilesStore'
import { FileSystemRepo } from '@/offline/FileSystemRepo'
import { useOfflineState } from '@/offline/useOfflineState'
import { useOfflineActions } from '@/offline/useOfflineActions'
import { ZoomableImage } from '@/ui/ZoomableImage'
import { DismissibleViewer } from '@/ui/DismissibleViewer'
import { FileMetadataSheet, FileMetadataSheetHandle } from '@/ui/FileMetadataSheet'
import { ShareSheet, ShareSheetHandle } from '@/ui/ShareSheet'

const TEXT_MAX_BYTES = 1_000_000

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const LoadingOverlay = ({ progress }: { progress?: number }) => (
  <View style={styles.overlay} pointerEvents="none">
    <ActivityIndicator size="large" color="#fff" />
    {typeof progress === 'number' ? (
      <View style={styles.progressWrapper}>
        <ProgressBar progress={Math.max(0, Math.min(1, progress))} color="#fff" />
      </View>
    ) : null}
  </View>
)

const PdfPreview = ({
  source,
  thumbnailUrl,
  onDismiss
}: {
  source: StreamSource
  thumbnailUrl: string | null
  onDismiss: () => void
}) => {
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Only allow swipe-down dismiss when the PDF is at page 1, otherwise the
  // gesture conflicts with the PDF's internal vertical scroll between pages.
  // (Pixel-level scroll position within a page is not exposed by
  // react-native-pdf; "on page 1" is the closest proxy we get.)
  const [atFirstPage, setAtFirstPage] = useState(true)
  return (
    <DismissibleViewer
      onDismiss={onDismiss}
      style={styles.viewerContainer}
      enabled={atFirstPage}
    >
      {thumbnailUrl && !loaded ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={150}
        />
      ) : null}
      <Pdf
        source={{ uri: source.uri, headers: source.headers, cache: true }}
        trustAllCerts={false}
        style={[styles.pdf, !loaded && styles.transparent]}
        onLoadProgress={p => setProgress(p)}
        onLoadComplete={() => setLoaded(true)}
        onPageChanged={(page: number) => setAtFirstPage(page === 1)}
        onError={err => {
          console.error('[PreviewScreen] pdf error', err)
          setError(typeof err === 'string' ? err : (err as Error)?.message ?? 'PDF error')
        }}
      />
      {error ? <ErrorOverlay message={error} /> : !loaded ? <LoadingOverlay progress={progress} /> : null}
    </DismissibleViewer>
  )
}

const ImagePreview = ({
  source,
  thumbnailUrl,
  onSingleTap,
  onDismiss
}: {
  source: StreamSource
  thumbnailUrl: string | null
  onSingleTap: () => void
  onDismiss: () => void
}) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <View style={styles.viewerContainer}>
      <ZoomableImage
        uri={source.uri}
        headers={source.headers}
        placeholderUri={thumbnailUrl}
        onSingleTap={onSingleTap}
        onDismiss={onDismiss}
        onLoad={() => setLoaded(true)}
        onError={err => {
          console.error('[PreviewScreen] image error', err)
          const e = err as { error?: string } | null
          setError(e?.error ?? 'Image error')
        }}
      />
      {error ? <ErrorOverlay message={error} /> : !loaded && !thumbnailUrl ? <LoadingOverlay /> : null}
    </View>
  )
}

const VideoPreview = ({
  source,
  onDismiss,
  onTap
}: {
  source: StreamSource
  onDismiss: () => void
  onTap?: () => void
}) => {
  const player = useVideoPlayer({ uri: source.uri, headers: source.headers }, p => {
    p.loop = false
    p.staysActiveInBackground = true
    p.play()
  })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true)
    })
    return () => sub.remove()
  }, [player])
  return (
    <DismissibleViewer onDismiss={onDismiss} onTap={onTap} style={styles.viewerContainer}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        allowsFullscreen
        allowsPictureInPicture
        startsPictureInPictureAutomatically
        nativeControls
      />
      {!ready ? <LoadingOverlay /> : null}
    </DismissibleViewer>
  )
}

const AudioPreview = ({ source, name }: { source: StreamSource; name: string }) => {
  const player = useAudioPlayer({ uri: source.uri, headers: source.headers })
  const status = useAudioPlayerStatus(player)
  // Keep audio playing when the app is backgrounded or the device is silenced.
  // iOS additionally requires UIBackgroundModes: audio in Info.plist; without
  // it the OS still suspends on background. Note as v2.
  useEffect(() => {
    void AudioModule.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false
    })
  }, [])
  const ready = status.isLoaded
  const duration = ready ? status.duration : 0
  const position = ready ? status.currentTime : 0
  return (
    <View style={[styles.viewerContainer, styles.audioContainer]}>
      <View style={styles.audioCard}>
        <IconButton
          icon={status.playing ? 'pause' : 'play'}
          size={56}
          mode="contained"
          disabled={!ready}
          onPress={() => {
            if (status.playing) player.pause()
            else player.play()
          }}
        />
        <Text style={styles.audioTitle} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.audioProgressRow}>
          <Text style={styles.audioTime}>{formatTime(position)}</Text>
          <View style={styles.audioBar}>
            <ProgressBar progress={duration > 0 ? position / duration : 0} color="#fff" />
          </View>
          <Text style={styles.audioTime}>{formatTime(duration)}</Text>
        </View>
      </View>
      {!ready ? <LoadingOverlay /> : null}
    </View>
  )
}

const TextPreview = ({ source }: { source: StreamSource }) => {
  const theme = useTheme()
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const resp = await fetch(source.uri, {
          headers: { ...source.headers, Range: `bytes=0-${TEXT_MAX_BYTES - 1}` }
        })
        if (!resp.ok && resp.status !== 206) throw new Error(`HTTP ${resp.status}`)
        const text = await resp.text()
        if (cancelled) return
        const totalHeader = resp.headers.get('Content-Range')
        if (totalHeader) {
          const total = Number(totalHeader.split('/')[1])
          if (Number.isFinite(total) && total > text.length) setTruncated(true)
        }
        setContent(text)
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Fetch error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source.uri, source.headers])

  if (error) return <ErrorOverlay message={error} />
  if (content === null) return <LoadingOverlay />
  return (
    <ScrollView style={[styles.textScroll, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.onBackground }]} selectable>
        {content}
      </Text>
      {truncated ? (
        <Text style={[styles.textTruncated, { color: theme.colors.onSurfaceVariant }]}>
          … (truncated)
        </Text>
      ) : null}
    </ScrollView>
  )
}

const ErrorOverlay = ({ message }: { message: string }) => (
  <View style={styles.overlay} pointerEvents="none">
    <Text style={styles.errorText}>{message}</Text>
  </View>
)

export default function PreviewScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const client = useClient()
  const insets = useSafeAreaInsets()
  const { fileId } = useLocalSearchParams<{ fileId: string }>()
  const [externalError, setExternalError] = useState<string | null>(null)
  const [uiVisible, setUiVisible] = useState(false)
  const sheetRef = useRef<FileMetadataSheetHandle>(null)
  const shareRef = useRef<ShareSheetHandle>(null)
  const fallbackTriggered = useRef(false)
  const offlineActions = useOfflineActions()

  const fileLookup = useQuery(fileByIdQuery(fileId ?? ''), {
    as: fileByIdQueryAs(fileId ?? ''),
    enabled: !!fileId
  })
  const lookupData = fileLookup.data
  const file = (Array.isArray(lookupData) ? lookupData[0] : lookupData) as
    | FileQueryResult
    | null
    | undefined

  // Re-renders when the offline state of this file changes (so a download
  // completing while the screen is open swaps the source to the local blob).
  const offlineEntry = useOfflineState(fileId ?? undefined)
  const source = useMemo<StreamSource | null>(() => {
    if (!fileId) return null
    // Prefer the local blob when available: works offline, no auth, instant.
    if (OfflineFilesStore.isPinnedAndDownloaded(fileId)) {
      return { uri: FileSystemRepo.localPath(fileId), headers: {} }
    }
    if (!client) return null
    try {
      return buildFileStreamSource(client, fileId)
    } catch {
      return null
    }
  }, [client, fileId, offlineEntry?.state])

  const thumbnailUrl = useMemo(
    () => (client && file?.links ? buildThumbnailUrl(client, file.links, 'large') : null),
    [client, file?.links]
  )

  const kind = getPreviewKind(file ?? null)

  // Unsupported types: download then native intent, then back.
  useEffect(() => {
    if (!client || !file || kind !== 'unsupported' || fallbackTriggered.current) return
    fallbackTriggered.current = true
    void (async () => {
      try {
        await openFileNatively(client, { _id: file._id, name: file.name, mime: file.mime })
        router.back()
      } catch (e) {
        console.error('[PreviewScreen] native fallback failed', e)
        setExternalError((e as Error).message ?? t('drive.preview.loadFailed'))
        fallbackTriggered.current = false
      }
    })()
  }, [client, file, kind, router, t])

  const onOpenExternally = async (): Promise<void> => {
    if (!client || !file) return
    try {
      await openFileNatively(client, { _id: file._id, name: file.name, mime: file.mime })
    } catch (e) {
      console.error('[PreviewScreen] open externally failed', e)
      setExternalError((e as Error).message ?? t('drive.preview.loadFailed'))
    }
  }

  const isLoadingFile = fileLookup.fetchStatus === 'loading' || (!file && !fileLookup.data)
  const title = file?.name ?? t('drive.preview.title')

  const renderViewer = (): React.ReactElement => {
    if (!source) return <LoadingState />
    switch (kind) {
      case 'pdf':
        return (
          <PdfPreview
            source={source}
            thumbnailUrl={thumbnailUrl}
            onDismiss={() => router.back()}
          />
        )
      case 'image':
        return (
          <ImagePreview
            source={source}
            thumbnailUrl={thumbnailUrl}
            onSingleTap={() => setUiVisible(v => !v)}
            onDismiss={() => router.back()}
          />
        )
      case 'video':
        return (
          <VideoPreview
            source={source}
            onDismiss={() => router.back()}
            onTap={restoreBar}
          />
        )
      case 'audio':
        return <AudioPreview source={source} name={file?.name ?? ''} />
      case 'text':
        return <TextPreview source={source} />
      case 'unsupported':
      default:
        return externalError ? (
          <ErrorState
            message={externalError}
            onRetry={() => {
              setExternalError(null)
              fallbackTriggered.current = false
            }}
          />
        ) : (
          <View style={styles.fallbackPanel}>
            <LoadingState />
          </View>
        )
    }
  }

  // Image viewer is fullscreen, no chrome by default; tap reveals a
  // translucent bottom bar with Share / Pin / Details. Other kinds keep
  // their header + footer.
  const isImage = kind === 'image'
  const isVideo = kind === 'video'
  const isPdf = kind === 'pdf'
  // Chromeless = no AppBar at top, transparent container so the modal
  // dismiss reveals the previous screen.
  const isChromeless = isImage || isVideo || isPdf
  const isPinned = !!offlineEntry?.isDirectPin

  // Bottom-bar visibility by kind:
  //   image: hidden by default, tap toggles
  //   video: visible 3 s after entry then auto-hides; tap restores
  //   pdf:   always visible (read-mode users want their actions)
  //   audio/text: always visible (already chromed)
  const showBar =
    isImage ? uiVisible :
    isVideo ? uiVisible :
    kind !== 'unsupported' && !!file
  const restoreBar = (): void => {
    setUiVisible(true)
  }

  // Auto-hide the video bar after a few seconds of inactivity.
  useEffect(() => {
    if (!isVideo || !uiVisible) return
    const t = setTimeout(() => setUiVisible(false), 3000)
    return () => clearTimeout(t)
  }, [isVideo, uiVisible])

  // Video starts with the bar visible (signal to the user that actions
  // exist); image starts hidden (pure-fullscreen feel).
  useEffect(() => {
    if (isVideo) setUiVisible(true)
  }, [isVideo])

  const togglePin = (): void => {
    if (!file) return
    if (isPinned) void offlineActions.unpin(file._id)
    else offlineActions.pin({ _id: file._id, name: file.name, size: file.size ?? null })
  }
  const openInfo = (): void => {
    if (!file) return
    sheetRef.current?.present({
      _id: file._id,
      name: file.name,
      size: file.size ?? null,
      mime: file.mime,
      class: file.class,
      type: file.type,
      updated_at: file.updated_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      path: (file as any).path,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cozyMetadata: (file as any).cozyMetadata
    })
  }
  const openShare = (): void => {
    if (!file) return
    shareRef.current?.present({ _id: file._id, name: file.name, type: 'file' })
  }

  return (
    <View
      style={[
        styles.container,
        isChromeless && styles.containerTransparent
      ]}
    >
      {!isChromeless ? <AppBar title={title} onBack={() => router.back()} /> : null}
      {isLoadingFile ? <LoadingState /> : renderViewer()}
      {externalError ? (
        <Text style={[styles.actionError, !isChromeless && styles.actionErrorChromed]}>
          {externalError}
        </Text>
      ) : null}
      {showBar ? (
        <View
          style={[
            styles.imageBottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) }
          ]}
          pointerEvents="box-none"
        >
          <Pressable style={styles.imageBottomAction} onPress={openShare}>
            <Icon name="share-variant" size={24} color="#fff" />
            <Text style={styles.imageBottomLabel}>{t('drive.fileMeta.share')}</Text>
          </Pressable>
          <Pressable style={styles.imageBottomAction} onPress={togglePin}>
            <Icon
              name={isPinned ? 'cloud-off-outline' : 'cloud-download-outline'}
              size={24}
              color="#fff"
            />
            <Text style={styles.imageBottomLabel}>
              {t(isPinned ? 'drive.offline.unpin' : 'drive.offline.pin')}
            </Text>
          </Pressable>
          <Pressable style={styles.imageBottomAction} onPress={() => void onOpenExternally()}>
            <Icon name="open-in-new" size={24} color="#fff" />
            <Text style={styles.imageBottomLabel}>{t('drive.preview.openExternally')}</Text>
          </Pressable>
          <Pressable style={styles.imageBottomAction} onPress={openInfo}>
            <Icon name="information-outline" size={24} color="#fff" />
            <Text style={styles.imageBottomLabel}>{t('drive.fileMeta.info')}</Text>
          </Pressable>
        </View>
      ) : null}
      <FileMetadataSheet ref={sheetRef} />
      <ShareSheet ref={shareRef} />
    </View>
  )
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  containerTransparent: { backgroundColor: 'transparent' },
  viewerContainer: { flex: 1 },
  pdf: { flex: 1, width: SCREEN_WIDTH, backgroundColor: '#000' },
  transparent: { backgroundColor: 'transparent' },
  image: { flex: 1, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  video: { flex: 1, width: SCREEN_WIDTH, backgroundColor: '#000' },
  audioContainer: { alignItems: 'center', justifyContent: 'center' },
  audioCard: { alignItems: 'center', padding: 24, gap: 16 },
  audioTitle: { color: '#fff', fontSize: 16, textAlign: 'center', maxWidth: 280 },
  audioProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 280 },
  audioBar: { flex: 1 },
  audioTime: { color: '#fff', fontVariant: ['tabular-nums'], fontSize: 12 },
  textScroll: { flex: 1, padding: 16 },
  text: { fontFamily: 'Menlo', fontSize: 13, lineHeight: 18 },
  textTruncated: { fontStyle: 'italic', marginTop: 16, textAlign: 'center' },
  fallbackPanel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionError: { color: '#ff6b6b', textAlign: 'center', marginTop: 4, fontSize: 12 },
  actionErrorChromed: { backgroundColor: '#000', paddingVertical: 8 },
  imageBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.65)'
  },
  imageBottomAction: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  imageBottomLabel: { color: '#fff', fontSize: 11 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 16
  },
  progressWrapper: { width: 200 },
  errorText: { color: '#fff', textAlign: 'center', paddingHorizontal: 32 }
})
