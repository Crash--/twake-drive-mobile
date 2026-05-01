export const getFileIcon = (type: string, mime?: string): string => {
  if (type === 'directory') return 'folder'
  if (!mime) return 'file'

  if (mime === 'application/pdf') return 'file-pdf-box'
  if (mime.startsWith('image/')) return 'file-image'
  if (mime.startsWith('video/')) return 'file-video'
  if (mime.startsWith('audio/')) return 'file-music'

  if (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'file-excel'
  }

  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'file-word'
  }

  if (mime.startsWith('text/')) return 'file-document'

  if (mime === 'application/zip' || mime === 'application/x-tar' || mime === 'application/x-gzip') {
    return 'folder-zip'
  }

  return 'file'
}
