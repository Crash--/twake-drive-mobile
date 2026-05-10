import { open } from '@op-engineering/op-sqlite'

interface Db {
  execute: (
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows?: { _array?: Array<Record<string, unknown>> } }>
}

const DB_NAME = 'platform-storage.sqlite'

let dbPromise: Promise<Db | null> | null = null

const openOnce = (): Promise<Db | null> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = open({ name: DB_NAME }) as unknown as Db
        await db.execute(
          'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
        )
        return db
      } catch (e) {
        console.error('[sqliteStorage] open failed', e)
        return null
      }
    })()
  }
  return dbPromise
}

export const sqliteStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const db = await openOnce()
    if (!db) return null
    try {
      const res = await db.execute('SELECT value FROM kv WHERE key = ?', [key])
      const row = res.rows?._array?.[0]
      return (row?.value as string | undefined) ?? null
    } catch (e) {
      console.error('[sqliteStorage] getItem failed', e)
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const db = await openOnce()
    if (!db) return
    try {
      await db.execute('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
        key,
        value
      ])
    } catch (e) {
      console.error('[sqliteStorage] setItem failed', e)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    const db = await openOnce()
    if (!db) return
    try {
      await db.execute('DELETE FROM kv WHERE key = ?', [key])
    } catch (e) {
      console.error('[sqliteStorage] removeItem failed', e)
    }
  },
  destroy: async (): Promise<void> => {
    const db = await openOnce()
    if (!db) return
    try {
      await db.execute('DROP TABLE IF EXISTS kv')
    } catch (e) {
      console.error('[sqliteStorage] destroy failed', e)
    }
    dbPromise = null
  }
}
