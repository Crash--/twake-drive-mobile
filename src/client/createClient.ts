import CozyClient from 'cozy-client'

import { Session } from '@/auth/types'

export const createClient = (session: Session): CozyClient =>
  new CozyClient({
    uri: session.uri,
    token: session.accessToken,
    appMetadata: {
      slug: 'twake-drive-mobile',
      version: '0.1.0'
    }
  })
