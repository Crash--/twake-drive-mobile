import CozyClient from 'cozy-client'

import { Session } from '@/auth/types'

export const createClient = (session: Session): CozyClient => {
  console.log(
    '[createClient] uri',
    session.uri,
    'clientID',
    session.oauthOptions.clientID,
    'tokenLen',
    session.token.accessToken?.length ?? 0
  )
  return new CozyClient({
    uri: session.uri,
    oauth: { ...session.oauthOptions, token: session.token },
    scope: ['*'],
    appMetadata: {
      slug: 'twake-drive-mobile',
      version: '0.1.0'
    }
  })
}
