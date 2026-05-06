/**
 * Returns true for cozy-notes (`*.cozy-note` files). On twake-drive web these
 * are routed to the dedicated `notes` app rather than opened with QuickLook
 * or in OnlyOffice.
 */
export const isCozyNoteFile = (name?: string): boolean =>
  !!name && /\.cozy-note$/i.test(name)

/**
 * Returns true for `*.docs-note` files. On twake-drive web these are routed
 * to the dedicated `docs` app via the `/bridge/docs/<externalId>` hash.
 */
export const isDocsNoteFile = (name?: string): boolean =>
  !!name && /\.docs-note$/i.test(name)

export const isOfficeFile = (mime?: string): boolean => {
  if (!mime) return false
  const officeMimes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
  ]
  return officeMimes.includes(mime)
}
