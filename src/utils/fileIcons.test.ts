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

  it('returns file-word for document mimes', () => {
    expect(getFileIcon('file', 'application/msword')).toBe('file-word')
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
})
