/**
 * Mime → icon classification, mirrored from twake-drive web's
 * src/lib/getMimeTypeIcon.js + src/lib/getFileMimetype.js.
 *
 * The 10 supported categories map directly to MaterialCommunityIcons icons.
 * For application/* mimes we regex-match the subtype against a vocabulary of
 * keywords (word/text/excel/spreadsheet/sheet/powerpoint/presentation/pdf/zip)
 * so that .docx, .ods, .pptx, etc. classify correctly without listing every
 * concrete mime explicitly.
 *
 * NOTE: we deliberately do NOT use the npm `mime` / `mime-types` packages.
 * Both import node `path` / `fs`, which Metro cannot resolve in RN.
 * The extension table below covers everything our 10 categories need.
 */

const EXTENSION_TO_MIME: Record<string, string> = {
  // text-like
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  // images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  // audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  // video
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  // documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  // archives
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  '7z': 'application/x-7z-compressed',
  // code
  js: 'application/javascript',
  ts: 'application/typescript',
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml'
}

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
  const dot = name.lastIndexOf('.')
  if (dot === -1) return 'application/octet-stream'
  const ext = name.slice(dot + 1).toLowerCase()
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
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
