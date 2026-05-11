import { restoreEntry, emptyTrash } from './trashActions'

const buildClient = (methods: {
  restore?: jest.Mock
  emptyTrash?: jest.Mock
}) =>
  ({
    collection: jest.fn(() => ({
      restore: methods.restore ?? jest.fn(),
      emptyTrash: methods.emptyTrash ?? jest.fn()
    }))
  }) as unknown as Parameters<typeof restoreEntry>[0]

describe('restoreEntry', () => {
  it('calls collection.restore with the id', async () => {
    const restore = jest.fn().mockResolvedValue({ data: { _id: 'a', name: 'doc' } })
    await restoreEntry(buildClient({ restore }), 'a')
    expect(restore).toHaveBeenCalledWith('a')
  })

  it('returns the restored doc', async () => {
    const restore = jest.fn().mockResolvedValue({ data: { _id: 'a', name: 'doc' } })
    const res = await restoreEntry(buildClient({ restore }), 'a')
    expect(res).toEqual({ _id: 'a', name: 'doc' })
  })

  it('propagates errors from restore', async () => {
    const restore = jest.fn().mockRejectedValue(new Error('boom'))
    await expect(restoreEntry(buildClient({ restore }), 'a')).rejects.toThrow('boom')
  })
})

describe('emptyTrash', () => {
  it('calls collection.emptyTrash with no args', async () => {
    const trash = jest.fn().mockResolvedValue({})
    await emptyTrash(buildClient({ emptyTrash: trash }))
    expect(trash).toHaveBeenCalledWith()
  })

  it('propagates errors from emptyTrash', async () => {
    const trash = jest.fn().mockRejectedValue(new Error('boom'))
    await expect(emptyTrash(buildClient({ emptyTrash: trash }))).rejects.toThrow('boom')
  })
})
