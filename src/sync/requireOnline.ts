import type { TFunction } from 'i18next'

import { SyncStatus } from './SyncContext'

/**
 * Guard helper used at every mutation call site.
 *
 * - Returns `true` when the app can talk to cozy-stack (`idle` or `syncing`).
 * - Returns `false` AND triggers a Snackbar otherwise (`offline` or `error`).
 *   The caller short-circuits its mutation flow when `false` is returned.
 */
export const requireOnline = (
  status: SyncStatus,
  showSnackbar: (msg: string) => void,
  t: TFunction
): boolean => {
  if (status === 'idle' || status === 'syncing') return true
  showSnackbar(t('drive.offline.requiresOnline'))
  return false
}
