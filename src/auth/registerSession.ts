import CozyClient from 'cozy-client'

import { OidcCallback, Session, OAuthOptions, OAuthToken } from './types'

interface AccessTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  scope: string
}

const buildOauthOptions = (): Omit<OAuthOptions, 'clientID' | 'clientSecret'> => ({
  clientName: 'Twake Drive Mobile',
  softwareID: 'twake-drive-mobile',
  redirectURI: 'cozy://',
  clientKind: 'mobile',
  clientURI: 'https://twake.app',
  scopes: ['io.cozy.files', 'io.cozy.files.shared-with-me']
})

export const registerSession = async (callback: OidcCallback): Promise<Session> => {
  const uri = `https://${callback.fqdn}`
  const client = new CozyClient({
    uri,
    appMetadata: { slug: 'twake-drive-mobile', version: '0.1.0' }
  })

  const stackClient = client.getStackClient()
  await stackClient.register(buildOauthOptions())

  const oauthOptions = stackClient.oauthOptions as OAuthOptions

  const tokenResult = (await stackClient.fetchJSON('POST', '/oidc/access_token', {
    code: callback.code,
    client_id: oauthOptions.clientID,
    client_secret: oauthOptions.clientSecret,
    scope: '*'
  })) as AccessTokenResponse

  const token: OAuthToken = {
    accessToken: tokenResult.access_token,
    refreshToken: tokenResult.refresh_token,
    tokenType: tokenResult.token_type,
    scope: tokenResult.scope
  }

  return { uri, oauthOptions, token }
}
