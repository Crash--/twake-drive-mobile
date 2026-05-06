import { getFileIcon } from './fileIcons'

describe('getFileIcon', () => {
  it('returns folder for type=directory', () => {
    expect(getFileIcon('directory')).toBe('folder')
  })

  it('returns pdf for application/pdf', () => {
    expect(getFileIcon('file', 'application/pdf')).toBe('pdf')
  })

  it('returns image for image/* mimes', () => {
    expect(getFileIcon('file', 'image/png')).toBe('image')
    expect(getFileIcon('file', 'image/jpeg')).toBe('image')
  })

  it('returns video for video/* mimes', () => {
    expect(getFileIcon('file', 'video/mp4')).toBe('video')
  })

  it('returns audio for audio/* mimes', () => {
    expect(getFileIcon('file', 'audio/mpeg')).toBe('audio')
  })

  it('returns sheet for spreadsheet mimes', () => {
    expect(getFileIcon('file', 'application/vnd.ms-excel')).toBe('sheet')
    expect(
      getFileIcon('file', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ).toBe('sheet')
  })

  it('classifies application/vnd.oasis.opendocument.spreadsheet as sheet', () => {
    expect(getFileIcon('file', 'application/vnd.oasis.opendocument.spreadsheet')).toBe('sheet')
  })

  it('returns text for word document mimes (matching twake-drive web)', () => {
    expect(getFileIcon('file', 'application/msword')).toBe('text')
    expect(
      getFileIcon('file', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe('text')
  })

  it('classifies application/vnd.oasis.opendocument.text as text', () => {
    expect(getFileIcon('file', 'application/vnd.oasis.opendocument.text')).toBe('text')
  })

  it('returns slide for presentation mimes', () => {
    expect(
      getFileIcon(
        'file',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
    ).toBe('slide')
    expect(getFileIcon('file', 'application/vnd.ms-powerpoint')).toBe('slide')
  })

  it('classifies application/vnd.oasis.opendocument.presentation as slide', () => {
    expect(getFileIcon('file', 'application/vnd.oasis.opendocument.presentation')).toBe('slide')
  })

  it('returns text for text/* mimes', () => {
    expect(getFileIcon('file', 'text/plain')).toBe('text')
  })

  it('returns zip for archive mimes', () => {
    expect(getFileIcon('file', 'application/zip')).toBe('zip')
  })

  it('returns generic files for unknown mime', () => {
    expect(getFileIcon('file', 'application/octet-stream')).toBe('files')
    expect(getFileIcon('file')).toBe('files')
  })

  it('returns note for .cozy-note files', () => {
    expect(getFileIcon('file', 'application/vnd.cozy.note', 'Daily.cozy-note')).toBe('note')
  })

  it('returns text for .docs-note files (no dedicated cozy-ui icon)', () => {
    expect(getFileIcon('file', undefined, 'meeting.docs-note')).toBe('text')
  })

  it('uses filename extension when mime is missing', () => {
    expect(getFileIcon('file', undefined, 'foo.pdf')).toBe('pdf')
    expect(getFileIcon('file', undefined, 'photo.png')).toBe('image')
  })

  it('uses filename extension when mime is octet-stream', () => {
    expect(getFileIcon('file', 'application/octet-stream', 'foo.pdf')).toBe('pdf')
  })
})
