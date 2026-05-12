import * as FS from 'expo-file-system/legacy'

// TODO(offline-v1.5): set NSURLIsExcludedFromBackupKey on iOS so this
// directory doesn't grow the iCloud Backup size. Requires a small
// native module — deferred for v1. Users who care can disable backup
// for the app in iOS Settings.
const dir = (): string => {
  if (!FS.documentDirectory) throw new Error('documentDirectory unavailable')
  return `${FS.documentDirectory}offline/`
}

export const FileSystemRepo = {
  dir,
  localPath: (fileId: string): string => `${dir()}${fileId}`,
  async init(): Promise<void> {
    const info = await FS.getInfoAsync(dir())
    if (!info.exists) {
      await FS.makeDirectoryAsync(dir(), { intermediates: true })
    }
  },
  async exists(fileId: string): Promise<boolean> {
    const info = await FS.getInfoAsync(FileSystemRepo.localPath(fileId))
    return Boolean(info.exists)
  },
  async delete(fileId: string): Promise<void> {
    await FS.deleteAsync(FileSystemRepo.localPath(fileId), { idempotent: true })
  },
  async totalBytes(): Promise<number> {
    const names = await FS.readDirectoryAsync(dir())
    let total = 0
    for (const name of names) {
      const info = await FS.getInfoAsync(`${dir()}${name}`)
      if (info.exists && 'size' in info && typeof info.size === 'number') total += info.size
    }
    return total
  }
}
