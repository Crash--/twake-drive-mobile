import { sqliteStorage } from './sqliteStorage'

const mockExec = jest.fn()

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({ execute: mockExec, executeSync: mockExec, close: jest.fn() }))
}))

describe('sqliteStorage', () => {
  beforeEach(() => {
    mockExec.mockReset()
    mockExec.mockResolvedValue({ rows: { _array: [] } })
    jest.resetModules()
  })

  it('returns null for missing keys', async () => {
    const { sqliteStorage } = require('./sqliteStorage')
    mockExec.mockResolvedValueOnce({ rows: { _array: [] } })
    expect(await sqliteStorage.getItem('missing')).toBeNull()
  })

  it('returns the stored value for a known key', async () => {
    const { sqliteStorage } = require('./sqliteStorage')
    mockExec.mockResolvedValueOnce({ rows: { _array: [] } }) // CREATE TABLE
    mockExec.mockResolvedValueOnce({ rows: { _array: [{ value: 'bar' }] } })
    expect(await sqliteStorage.getItem('foo')).toBe('bar')
  })

  it('setItem upserts via INSERT OR REPLACE', async () => {
    const { sqliteStorage } = require('./sqliteStorage')
    await sqliteStorage.setItem('k', 'v')
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE'),
      ['k', 'v']
    )
  })

  it('removeItem deletes by key', async () => {
    const { sqliteStorage } = require('./sqliteStorage')
    await sqliteStorage.removeItem('k')
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM kv WHERE key = ?'),
      ['k']
    )
  })

  it('destroy drops the table', async () => {
    const { sqliteStorage } = require('./sqliteStorage')
    await sqliteStorage.destroy()
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE'))
  })

  it('returns null when SQLite throws on open', async () => {
    const { open } = require('@op-engineering/op-sqlite')
    open.mockImplementationOnce(() => {
      throw new Error('disk full')
    })
    const { sqliteStorage } = require('./sqliteStorage')
    expect(await sqliteStorage.getItem('foo')).toBeNull()
  })
})
