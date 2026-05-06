import { getFileIcon } from './fileIcons'

describe('getFileIcon', () => {
  it('returns folder for type=directory', () => {
    expect(getFileIcon('directory')).toBe('folder')
  })

  it('returns file-pdf-box for application/pdf', () => {
    expect(getFileIcon('file', 'application/pdf')).toBe('file-pdf-box')
  })

  it('returns file-image for image/* mimes', () => {
    expect(getFileIcon('file', 'image/png')).toBe('file-image')
    expect(getFileIcon('file', 'image/jpeg')).toBe('file-image')
  })

  it('returns file-video for video/* mimes', () => {
    expect(getFileIcon('file', 'video/mp4')).toBe('file-video')
  })

  it('returns file-music for audio/* mimes', () => {
    expect(getFileIcon('file', 'audio/mpeg')).toBe('file-music')
  })

  it('returns file-excel for spreadsheet mimes', () => {
    expect(getFileIcon('file', 'application/vnd.ms-excel')).toBe('file-excel')
    expect(
      getFileIcon('file', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ).toBe('file-excel')
  })

  it('classifies application/vnd.oasis.opendocument.spreadsheet as sheet', () => {
    expect(getFileIcon('file', 'application/vnd.oasis.opendocument.spreadsheet')).toBe(
      'file-excel'
    )
  })

  it('returns file-document for word document mimes (matching twake-drive web)', () => {
    expect(getFileIcon('file', 'application/msword')).toBe('file-document')
    expect(
      getFileIcon('file', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe('file-document')
  })

  it('classifies application/vnd.oasis.opendocument.text as text', () => {
    expect(getFileIcon('file', 'application/vnd.oasis.opendocument.text')).toBe('file-document')
  })

  it('returns file-presentation-box for presentation mimes', () => {
    expect(
      getFileIcon('file', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    ).toBe('file-presentation-box')
    expect(getFileIcon('file', 'application/vnd.ms-powerpoint')).toBe('file-presentation-box')
  })

  it('classifies application/vnd.oasis.opendocument.presentation as slide', () => {
    expect(getFileIcon('file', 'application/vnd.oasis.opendocument.presentation')).toBe(
      'file-presentation-box'
    )
  })

  it('returns file-document for text/* mimes', () => {
    expect(getFileIcon('file', 'text/plain')).toBe('file-document')
  })

  it('returns folder-zip for archive mimes', () => {
    expect(getFileIcon('file', 'application/zip')).toBe('folder-zip')
  })

  it('returns generic file for unknown mime', () => {
    expect(getFileIcon('file', 'application/octet-stream')).toBe('file')
    expect(getFileIcon('file')).toBe('file')
  })

  it('returns note-text for .cozy-note files', () => {
    expect(getFileIcon('file', 'application/vnd.cozy.note', 'Daily.cozy-note')).toBe('note-text')
  })

  it('returns file-document-edit for .docs-note files', () => {
    expect(getFileIcon('file', undefined, 'meeting.docs-note')).toBe('file-document-edit')
  })

  it('uses filename extension when mime is missing', () => {
    expect(getFileIcon('file', undefined, 'foo.pdf')).toBe('file-pdf-box')
    expect(getFileIcon('file', undefined, 'photo.png')).toBe('file-image')
  })

  it('uses filename extension when mime is octet-stream', () => {
    expect(getFileIcon('file', 'application/octet-stream', 'foo.pdf')).toBe('file-pdf-box')
  })
})
