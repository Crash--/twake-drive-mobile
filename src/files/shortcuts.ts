// Deep import to skip cozy-client's mobile.native authentication module which
// pulls in `react-native-inappbrowser-reborn` (we stub that in the bundler but
// jest does not resolve it). The dsl module is self-contained.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Q } = require('cozy-client/dist/queries/dsl') as typeof import('cozy-client')
import type CozyClient from 'cozy-client'

/**
 * Mirror of `useFetchShortcut` from cozy-client (used by twake-drive web's
 * `ExternalRedirect`): we resolve a `.url` file by querying the
 * `io.cozy.files.shortcuts` doctype which exposes the embedded URL.
 *
 * Returns the resolved target URL, or `null` when the document does not
 * carry one.
 */
export const fetchShortcutUrl = async (
  client: CozyClient,
  fileId: string
): Promise<string | null> => {
  const result = (await client.query(Q('io.cozy.files.shortcuts').getById(fileId), {
    as: `io.cozy.files.shortcuts/${fileId}`,
    singleDocData: true
  } as unknown as Parameters<CozyClient['query']>[1])) as {
    data?: {
      url?: string
      attributes?: { url?: string }
    }
  }
  return result.data?.url ?? result.data?.attributes?.url ?? null
}
