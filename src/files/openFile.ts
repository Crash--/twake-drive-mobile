// Use the legacy import. expo-file-system v19 (SDK 54) deprecates
// `cacheDirectory`, `makeDirectoryAsync` and `downloadAsync` on the root
// module — they throw at runtime. The legacy submodule keeps the same API.
import * as FileSystem from 'expo-file-system/legacy'
import FileViewer from 'react-native-file-viewer'
import type CozyClient from 'cozy-client'

export interface OpenableFile {
  _id: string
  name: string
  mime?: string
}

const sanitizeName = (name: string): string => name.replace(/[/\\?%*:|"<>]/g, '_')

interface MinimalStackClient {
  uri: string
  getAccessToken: () => string | null | undefined
}

export const openFileNatively = async (
  client: CozyClient,
  file: OpenableFile
): Promise<void> => {
  const stackClient = client.getStackClient() as unknown as MinimalStackClient
  const stackUri = stackClient.uri
  const token = stackClient.getAccessToken()
  if (!token) throw new Error('No access token available')

  const downloadUrl = `${stackUri}/files/download/${encodeURIComponent(file._id)}`
  const cacheDir = FileSystem.cacheDirectory
  if (!cacheDir) throw new Error('Cache directory unavailable')
  const localPath = `${cacheDir}twake-drive/${file._id}-${sanitizeName(file.name)}`

  await FileSystem.makeDirectoryAsync(`${cacheDir}twake-drive/`, { intermediates: true })

  const result = await FileSystem.downloadAsync(downloadUrl, localPath, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (result.status >= 400) {
    throw new Error(`Download failed (HTTP ${result.status})`)
  }

  await FileViewer.open(result.uri, {
    showOpenWithDialog: true,
    showAppsSuggestions: true
  })
}
