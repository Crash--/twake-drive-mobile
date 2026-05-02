const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const stub = path.resolve(__dirname, 'src/utils/emptyModule.js')

const STUBBED = new Set([
  'react-native-inappbrowser-reborn',
  'react-native-ios11-devicecheck',
  'react-native-google-play-integrity'
])

const upstreamResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (STUBBED.has(moduleName)) {
    return { type: 'sourceFile', filePath: stub }
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
