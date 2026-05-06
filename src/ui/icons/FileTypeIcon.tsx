/**
 * Renders the cozy-ui FileType icon matching a {@link FileIconKey}.
 *
 * Centralises the key → component mapping so callers stay declarative:
 *
 *   const iconKey = getFileIcon(file.type, file.mime, file.name)
 *   <FileTypeIcon icon={iconKey} size={32} />
 *
 * Defaults to the generic "files" icon if an unknown key is passed.
 */
import React from 'react'

import {
  CozyIconProps,
  FileTypeAudioIcon,
  FileTypeBinIcon,
  FileTypeCodeIcon,
  FileTypeDocsIcon,
  FileTypeFilesIcon,
  FileTypeFolderIcon,
  FileTypeImageIcon,
  FileTypeNoteIcon,
  FileTypePdfIcon,
  FileTypeSheetIcon,
  FileTypeSlideIcon,
  FileTypeTextIcon,
  FileTypeVideoIcon,
  FileTypeZipIcon
} from '@/ui/icons/CozyFileTypes'
import type { FileIconKey } from '@/utils/fileIcons'

const COMPONENT: Record<FileIconKey, React.FC<CozyIconProps>> = {
  audio: FileTypeAudioIcon,
  bin: FileTypeBinIcon,
  code: FileTypeCodeIcon,
  docs: FileTypeDocsIcon,
  files: FileTypeFilesIcon,
  folder: FileTypeFolderIcon,
  image: FileTypeImageIcon,
  note: FileTypeNoteIcon,
  pdf: FileTypePdfIcon,
  sheet: FileTypeSheetIcon,
  slide: FileTypeSlideIcon,
  text: FileTypeTextIcon,
  video: FileTypeVideoIcon,
  zip: FileTypeZipIcon
}

interface Props {
  icon: FileIconKey
  size?: number
}

export const FileTypeIcon = ({ icon, size = 32 }: Props) => {
  const Component = COMPONENT[icon] ?? FileTypeFilesIcon
  return <Component size={size} />
}
