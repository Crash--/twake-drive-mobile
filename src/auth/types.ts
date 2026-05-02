export interface TwakeConfiguration {
  'twake-pass-login-uri'?: string
  'twake-flagship-login-uri'?: string
}

export interface OidcCallback {
  fqdn: string
  code: string
  defaultRedirection: string | null
}

export interface OAuthOptions {
  clientID: string
  clientSecret: string
  clientName: string
  softwareID: string
  redirectURI: string
  clientKind: string
  clientURI: string
  scopes: string[]
  registrationAccessToken?: string
}

export interface OAuthToken {
  accessToken: string
  refreshToken: string
  tokenType: string
  scope: string
}

export interface Session {
  uri: string
  oauthOptions: OAuthOptions
  token: OAuthToken
}

export class UserCancelledError extends Error {
  constructor() {
    super('User cancelled OIDC flow')
    this.name = 'UserCancelledError'
  }
}

export class DiscoveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiscoveryError'
  }
}
