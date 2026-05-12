import { useEffect, useState } from 'react'

import { OfflineFilesStore } from './OfflineFilesStore'
import { OfflineFileEntry } from './types'

export const useOfflineState = (fileId: string | undefined): OfflineFileEntry | undefined => {
  const [entry, setEntry] = useState<OfflineFileEntry | undefined>(
    fileId ? OfflineFilesStore.get(fileId) : undefined
  )
  useEffect(() => {
    if (!fileId) return
    setEntry(OfflineFilesStore.get(fileId))
    return OfflineFilesStore.subscribe(fileId, setEntry)
  }, [fileId])
  return entry
}

export const useOfflineFolderPinned = (dirId: string | undefined): boolean => {
  const [pinned, setPinned] = useState<boolean>(!!(dirId && OfflineFilesStore.getFolder(dirId)))
  useEffect(() => {
    if (!dirId) return
    setPinned(!!OfflineFilesStore.getFolder(dirId))
    return OfflineFilesStore.subscribeAll(() => setPinned(!!OfflineFilesStore.getFolder(dirId)))
  }, [dirId])
  return pinned
}
