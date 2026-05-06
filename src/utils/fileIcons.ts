import mime from 'mime-types'

/**
 * Mime → icon classification, mirrored from twake-drive web's
 * src/lib/getMimeTypeIcon.js + src/lib/getFileMimetype.js.
 *
 * The 10 supported categories map directly to MaterialCommunityIcons icons.
 * For application/* mimes we regex-match the subtype against a vocabulary of
 * keywords (word/text/excel/spreadsheet/sheet/powerpoint/presentation/pdf/zip)
 * so that .docx, .ods, .pptx, etc. classify correctly without listing every
 * concrete mime explicitly.
 */

const MAPPING_SUBTYPE: Record<string, string> = {
  word: 'text',
  text: 'text',
  zip: 'zip',
  pdf: 'pdf',
  spreadsheet: 'sheet',
  excel: 'sheet',
  sheet: 'sheet',
  presentation: 'slide',
  powerpoint: 'slide'
}

const ICONS: Record<string, string> = {
  audio: 'file-music',
  bin: 'application-braces-outline',
  code: 'code-tags',
  image: 'file-image',
  pdf: 'file-pdf-box',
  slide: 'file-presentation-box',
  sheet: 'file-excel',
  text: 'file-document',
  video: 'file-video',
  zip: 'folder-zip'
}

const NOTE_RE = /\.cozy-note$/i
const DOCS_NOTE_RE = /\.docs-note$/i

const SUBTYPE_KEYS = Object.keys(MAPPING_SUBTYPE)
const SUBTYPE_RE = new RegExp('(' + SUBTYPE_KEYS.join('|') + ')', 'i')

const classifyMime = (mimeType: string): string | undefined => {
  const slash = mimeType.indexOf('/')
  const type = slash >= 0 ? mimeType.slice(0, slash) : mimeType
  const subtype = slash >= 0 ? mimeType.slice(slash + 1) : ''
  if (ICONS[type]) return type
  if (type === 'application') {
    const m = subtype.match(SUBTYPE_RE)
    if (m) return MAPPING_SUBTYPE[m[1].toLowerCase()]
  }
  return undefined
}

const lookupMimeFromName = (name: string): string => {
  const looked = mime.lookup(name)
  return typeof looked === 'string' ? looked : 'application/octet-stream'
}

export const getFileIcon = (type: string, mimeArg?: string, name?: string): string => {
  if (type === 'directory') return 'folder'
  if (name && NOTE_RE.test(name)) return 'note-text'
  if (name && DOCS_NOTE_RE.test(name)) return 'file-document-edit'

  const effectiveMime =
    !mimeArg || mimeArg === 'application/octet-stream'
      ? name
        ? lookupMimeFromName(name.toLowerCase())
        : 'application/octet-stream'
      : mimeArg

  const category = classifyMime(effectiveMime)
  return category ? ICONS[category] : 'file'
}
