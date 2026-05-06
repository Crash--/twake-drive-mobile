/**
 * cozy-ui FileType icons mirrored as react-native-svg components.
 *
 * Source: https://github.com/cozy/cozy-ui/tree/master/react/Icons
 *
 * The path data, fills, strokes, and viewBox values are copied verbatim from
 * the upstream `FileType*.jsx` SVG-react components so the visual output
 * matches twake-drive web exactly. Only the JSX wrappers were translated:
 * `<svg>` → `<Svg>`, `<path>` → `<Path>`, `<circle>` → `<Circle>`, `<defs>`
 * → `<Defs>`, `<linearGradient>` → `<LinearGradient>`, `<stop>` → `<Stop>`.
 *
 * No `react-native-svg-transformer` is used — these are inline RN-Svg
 * primitives, so Metro bundles them like any other component.
 */
import React from 'react'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'

export interface CozyIconProps {
  size?: number
}

export const FileTypeAudioIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#F5FDFD"
      stroke="#0DCBCF"
    />
    <Path
      d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88zm-8.4 5.933c0 .92-.746 1.667-1.667 1.667a.802.802 0 01-.588-.245.803.803 0 01-.245-.588V10.05c0-.52.099-1.009.297-1.463.198-.455.465-.851.802-1.188a3.812 3.812 0 011.187-.802A3.628 3.628 0 017.57 6.3c.52 0 1.009.099 1.463.297.455.198.851.465 1.188.802.337.337.604.733.802 1.188.198.454.297.942.297 1.463v2.917a.802.802 0 01-.245.588.802.802 0 01-.588.245c-.92 0-1.667-.746-1.667-1.667V11.3c0-.46.373-.833.833-.833h.417c.23 0 .417-.187.417-.417 0-.812-.283-1.502-.85-2.068-.565-.566-1.255-.849-2.067-.849-.813 0-1.502.283-2.068.85-.566.565-.849 1.255-.849 2.067 0 .23.187.417.417.417h.417c.46 0 .833.373.833.833v.833z"
      fill="#0DCBCF"
    />
  </Svg>
)

export const FileTypeBinIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 16" fill="none" width={size} height={size}>
    <Path
      d="M3.52.5h5.792l4.908 4.907V12.8a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V3.2A2.7 2.7 0 013.52.5z"
      fill="#E8EDF3"
      stroke="#4F5B69"
    />
    <Path
      d="M14.72 5.4L9.32 0v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88zm-8.2 3.671a1.23 1.23 0 01-.703-.2 1.267 1.267 0 01-.45-.578 2.354 2.354 0 01-.156-.91c0-.352.053-.653.157-.902a1.24 1.24 0 01.45-.568c.197-.13.43-.196.701-.196.271 0 .504.065.7.196.195.13.346.32.451.57.106.247.158.548.157.9 0 .356-.053.66-.158.912a1.257 1.257 0 01-.45.577 1.21 1.21 0 01-.7.2zm0-.568c.185 0 .333-.093.443-.28.111-.186.166-.466.165-.84 0-.245-.025-.45-.076-.613a.79.79 0 00-.212-.368.462.462 0 00-.32-.124c-.185 0-.333.093-.444.277-.11.185-.166.46-.167.829 0 .249.024.456.074.623.05.165.122.29.214.373a.466.466 0 00.322.123zm3.204-2.742V9H9.04V6.411h-.02l-.741.465V6.27l.802-.508h.643zm-3.027 4V13h-.684v-2.589h-.02l-.741.465v-.607l.802-.508h.643zm2.04 3.31a1.23 1.23 0 01-.702-.2 1.267 1.267 0 01-.45-.578 2.354 2.354 0 01-.156-.91c0-.352.052-.653.157-.902a1.24 1.24 0 01.45-.568c.196-.13.43-.196.7-.196.272 0 .505.065.7.196.196.13.347.32.452.57.106.247.158.548.157.9 0 .356-.053.66-.158.912a1.257 1.257 0 01-.45.577c-.195.133-.428.2-.7.2zm0-.567c.185 0 .334-.094.444-.28.111-.187.166-.467.165-.84 0-.246-.026-.45-.076-.614a.79.79 0 00-.212-.368.462.462 0 00-.321-.123c-.185 0-.332.092-.443.276-.11.185-.166.46-.168.829 0 .249.025.456.075.623.05.165.122.29.213.373a.47.47 0 00.323.123z"
      fill="#4F5B69"
    />
  </Svg>
)

export const FileTypeCodeIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#FDF5FA"
      stroke="#E643B3"
    />
    <Path
      d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88zm-8.404 6.089a.359.359 0 01-.492 0l-2.004-1.88 2-1.875a.365.365 0 11.5.534l-1.44 1.35 1.436 1.347a.36.36 0 010 .524zm3.004-.005a.365.365 0 01-.5-.533l1.44-1.35-1.436-1.347a.36.36 0 11.491-.524l2.005 1.88-2 1.874z"
      fill="#E643B3"
    />
  </Svg>
)

export const FileTypeFilesIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.2h5.834l4.966 4.966V13.6a2.8 2.8 0 01-2.8 2.8h-8a2.8 2.8 0 01-2.8-2.8V4a2.8 2.8 0 012.8-2.8z"
      fill="#E8EDF3"
      stroke="#4F5B69"
      strokeWidth={0.8}
    />
    <Path d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88z" fill="#4F5B69" />
    <Path
      d="M4.695 14.05v-1.476L9.278 8a.78.78 0 01.23-.148.718.718 0 01.534 0 .61.61 0 01.226.156l.477.486c.07.064.12.14.152.226a.753.753 0 010 .525.65.65 0 01-.152.23L6.171 14.05H4.695zm5.07-4.583l.486-.486-.487-.487-.486.487.486.486z"
      fill="#4F5B69"
      fillOpacity={0.72}
    />
  </Svg>
)

export const FileTypeFolderIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 16 14" fill="none" width={size} height={size}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 2.125h6.4c.88 0 1.6.731 1.6 1.625v8.125c0 .894-.72 1.625-1.6 1.625H1.6c-.88 0-1.6-.731-1.6-1.625l.008-9.75C.008 1.231.72.5 1.6.5h4.8L8 2.125z"
      fill="url(#file-type-folder_svg__paint0_linear_11296_8360)"
    />
    <Defs>
      <LinearGradient
        id="file-type-folder_svg__paint0_linear_11296_8360"
        x1={8}
        y1={0.5}
        x2={8}
        y2={16.25}
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset={0.044} stopColor="#1D7AFF" />
        <Stop offset={0.13} stopColor="#7CB2FF" />
        <Stop offset={0.617} stopColor="#76AFFF" />
        <Stop offset={1} stopColor="#4290FF" />
      </LinearGradient>
    </Defs>
  </Svg>
)

export const FileTypeImageIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#FBFDF5"
      stroke="#A8D306"
    />
    <Path d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88z" fill="#A8D306" />
    <Circle cx={10.632} cy={7.818} r={0.938} fill="#A8D306" />
    <Path
      d="M3.11 13.385a.23.23 0 00.18.37h8.435a.23.23 0 00.18-.37l-2.64-3.38-2.343 3-1.758-2.25-2.054 2.63z"
      fill="#A8D306"
    />
  </Svg>
)

export const FileTypeNoteIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#FDFAF5"
      stroke="#FFB81E"
    />
    <Path
      d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88zM4.127 14.183v-1.476L8.71 8.132a.78.78 0 01.23-.147.718.718 0 01.534 0 .61.61 0 01.226.156l.477.486c.07.064.12.14.152.226a.75.75 0 010 .525.65.65 0 01-.152.23l-4.574 4.575H4.127zm5.07-4.584l.485-.486-.486-.486-.486.486.486.486z"
      fill="#FFB81E"
    />
  </Svg>
)

export const FileTypePdfIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 16" fill="none" width={size} height={size}>
    <Path
      d="M3.2.5h5.792L13.9 5.407V12.8a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V3.2A2.7 2.7 0 013.2.5z"
      fill="#FDF5F4"
      stroke="#D32C3C"
    />
    <Path
      d="M14.4 5.4L9 0v2.793C9 4.233 10.128 5.4 11.52 5.4h2.88zM2.757 12.8V9.2h1.486c.255 0 .479.053.67.158.192.106.341.254.448.445.106.19.16.414.16.67 0 .257-.055.48-.165.67a1.102 1.102 0 01-.46.435 1.472 1.472 0 01-.687.153h-.888v-.76h.7c.11 0 .203-.02.28-.059a.426.426 0 00.18-.174.528.528 0 00.064-.265.513.513 0 00-.063-.264.408.408 0 00-.18-.169.606.606 0 00-.281-.06h-.33v2.82h-.934zm4.431 0H5.863V9.2h1.312c.354 0 .66.072.918.216.259.143.458.35.598.619.142.268.212.59.212.965s-.07.697-.21.967c-.14.268-.338.474-.595.618a1.84 1.84 0 01-.91.215zm-.39-.83h.357a1 1 0 00.435-.086.57.57 0 00.276-.297c.064-.14.096-.336.096-.587 0-.25-.033-.447-.098-.587a.572.572 0 00-.282-.297 1.07 1.07 0 00-.454-.086h-.33v1.94zm2.538.83V9.2h2.42v.787H10.27v.62h1.339v.787H10.27V12.8h-.934z"
      fill="#D32C3C"
    />
  </Svg>
)

export const FileTypeSheetIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#F5FDF7"
      stroke="#248A3D"
    />
    <Path d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88z" fill="#248A3D" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.356 9.2h1.32l.806 1.239.824-1.234h1.302l-1.54 2.085 1.608 2.306H8.477l-1.009-1.444-.577.86h.585v.588h-2.2l1.6-2.296L5.356 9.2z"
      fill="#34C759"
    />
  </Svg>
)

export const FileTypeSlideIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 16" fill="none" width={size} height={size}>
    <Path
      d="M3.2.5h5.792L13.9 5.407V12.8a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V3.2A2.7 2.7 0 013.2.5z"
      fill="#FDFAF5"
      stroke="#FF9500"
    />
    <Path d="M14.4 5.4L9 0v2.793C9 4.233 10.128 5.4 11.52 5.4h2.88z" fill="#FF9500" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.557 8.4v4.4h.836v-1.588h1c.701 0 1.27-.63 1.27-1.406 0-.776-.569-1.406-1.27-1.406H5.557zm.836 2.15V9.062h.821c.371 0 .672.333.672.744s-.3.744-.672.744h-.821z"
      fill="#FF9500"
    />
  </Svg>
)

export const FileTypeTextIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 16" fill="none" width={size} height={size}>
    <Path
      d="M3.2.5h5.792L13.9 5.407V12.8a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V3.2A2.7 2.7 0 013.2.5z"
      fill="#F2F8FF"
      stroke="#006BD8"
    />
    <Path
      d="M14.4 5.4L9 0v2.793C9 4.233 10.128 5.4 11.52 5.4h2.88zm-8.868 3H4.6l.974 4.4h.955l.632-2.562.608 2.562h.898L9.8 8.4H8.226v.733h.536l-.544 2.104L7.656 8.4h-.9l-.699 2.877L5.532 8.4z"
      fill="#006BD8"
    />
  </Svg>
)

export const FileTypeVideoIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#FDF5FA"
      stroke="#E64343"
    />
    <Path
      d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88zm-5.64 6.1v-5h.865v5H9.08zm-4.76 0v-5l3.894 2.5-3.894 2.5z"
      fill="#E64343"
    />
  </Svg>
)

export const FileTypeZipIcon = ({ size = 24 }: CozyIconProps) => (
  <Svg viewBox="0 0 15 17" fill="none" width={size} height={size}>
    <Path
      d="M3.52 1.3h5.792l4.908 4.907V13.6a2.7 2.7 0 01-2.7 2.7h-8a2.7 2.7 0 01-2.7-2.7V4a2.7 2.7 0 012.7-2.7z"
      fill="#E8EDF3"
      stroke="#4F5B69"
    />
    <Path
      d="M14.72 6.2L9.32.8v2.793c0 1.44 1.128 2.607 2.52 2.607h2.88zm-8.4 2.35h1.25V9.8H6.32zM7.57 9.8h1.25v1.25H7.57zm-1.25 1.25h1.25v1.25H6.32zm1.25 1.25h1.25v1.25H7.57zm-1.25 1.25h1.25v1.25H6.32z"
      fill="#4F5B69"
    />
  </Svg>
)
