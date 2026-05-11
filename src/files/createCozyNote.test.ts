import { createCozyNote } from './createCozyNote'

const makeClient = (createImpl: (...args: unknown[]) => unknown) =>
  ({
    collection: () => ({ create: createImpl })
  }) as unknown as import('cozy-client').default

describe('createCozyNote', () => {
  it('calls io.cozy.notes.create with dir_id', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ data: { _id: 'note-1', attributes: { name: 'Untitled' } } })
    const result = await createCozyNote(makeClient(create), 'dir-X')
    expect(create).toHaveBeenCalledWith({ dir_id: 'dir-X' })
    expect(result).toEqual({ _id: 'note-1', name: 'Untitled' })
  })

  it('throws when the response has no id', async () => {
    const create = jest.fn().mockResolvedValue({ data: {} })
    await expect(createCozyNote(makeClient(create), 'dir-X')).rejects.toThrow(/no id/)
  })
})
