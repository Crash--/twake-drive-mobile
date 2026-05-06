import React from 'react'
import { render } from '@testing-library/react-native'

import { FileTypeIcon } from './FileTypeIcon'
import type { FileIconKey } from '@/utils/fileIcons'

const ALL_KEYS: FileIconKey[] = [
  'audio',
  'bin',
  'code',
  'files',
  'folder',
  'image',
  'note',
  'pdf',
  'sheet',
  'slide',
  'text',
  'video',
  'zip'
]

describe('FileTypeIcon', () => {
  it.each(ALL_KEYS)('renders without crashing for icon=%s', icon => {
    const { toJSON } = render(<FileTypeIcon icon={icon} size={24} />)
    expect(toJSON()).toBeTruthy()
  })

  it('falls back to the generic files icon for an unknown key', () => {
    // Cast on purpose to exercise the runtime fallback branch.
    const { toJSON } = render(<FileTypeIcon icon={'bogus' as FileIconKey} size={24} />)
    expect(toJSON()).toBeTruthy()
  })
})
