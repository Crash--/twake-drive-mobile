import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useClient } from 'cozy-client'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'

interface OnlyOfficeConfig {
  url: string
  document: { title?: string; [k: string]: unknown }
  editor: object
  token: string
  documentType: string
}

const buildHtml = (cfg: OnlyOfficeConfig): string => {
  const inner = JSON.stringify({
    document: cfg.document,
    editorConfig: cfg.editor,
    token: cfg.token,
    documentType: cfg.documentType
  })
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html,body,#editor{margin:0;padding:0;height:100%;width:100%;}</style>
</head>
<body>
<div id="editor"></div>
<script src="${cfg.url}/web-apps/apps/api/documents/api.js"></script>
<script>
  (function() {
    try {
      var config = ${inner};
      config.events = {
        onAppReady: function() {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready')
        },
        onError: function(e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage('error: ' + JSON.stringify(e))
        }
      };
      new DocsAPI.DocEditor('editor', config);
    } catch (err) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('exception: ' + (err && err.message ? err.message : String(err)))
    }
  })();
</script>
</body>
</html>`
}

export default function OnlyOfficeScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { fileId } = useLocalSearchParams<{ fileId: string }>()
  const client = useClient()
  const [config, setConfig] = useState<OnlyOfficeConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!client || !fileId) return
      try {
        const resp = (await client
          .getStackClient()
          .fetchJSON('GET', '/office/' + encodeURIComponent(fileId) + '/open')) as {
          data: { attributes: { onlyoffice: OnlyOfficeConfig } }
        }
        if (cancelled) return
        const oo = resp?.data?.attributes?.onlyoffice
        if (!oo?.url || !oo?.document || !oo?.editor || !oo?.token || !oo?.documentType) {
          throw new Error('OnlyOffice config incomplete')
        }
        setConfig(oo)
        const docTitle = oo.document?.title
        if (typeof docTitle === 'string' && docTitle) setName(docTitle)
      } catch (e) {
        console.error('[OnlyOfficeScreen] config fetch failed', e)
        if (!cancelled) setError((e as Error).message ?? 'Failed to load')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [client, fileId])

  return (
    <View style={styles.container}>
      <AppBar title={name || t('drive.onlyoffice.title')} onBack={() => router.back()} />
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null)
            setConfig(null)
            // re-trigger effect by replacing the route
            router.replace(`/(drive)/onlyoffice/${fileId}`)
          }}
        />
      ) : !config ? (
        <LoadingState />
      ) : (
        <WebView
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          source={{ html: buildHtml(config) }}
          style={styles.webview}
          onMessage={event => {
            console.log('[OnlyOfficeScreen] webview message', event.nativeEvent.data)
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 }
})
