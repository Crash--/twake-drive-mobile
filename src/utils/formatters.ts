export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} o`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} Ko`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} Mo`
  const gb = mb / 1024
  return `${gb.toFixed(1)} Go`
}
