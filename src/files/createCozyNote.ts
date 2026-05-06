import type CozyClient from 'cozy-client'

export interface CreatedNote {
  _id: string
  name?: string
}

interface CreateNoteResultData {
  _id?: string
  id?: string
  attributes?: { name?: string }
}

interface NotesCollection {
  create: (attrs: { dir_id: string }) => Promise<{ data: CreateNoteResultData }>
}

/**
 * Mirrors twake-drive web's CreateNoteItem flow: ask the cozy stack to
 * create a new `io.cozy.notes` document inside `dirId`. The stack is the
 * one that fills in defaults (title, schema...). Returns the new note id.
 */
export const createCozyNote = async (
  client: CozyClient,
  dirId: string
): Promise<CreatedNote> => {
  const collection = client.collection('io.cozy.notes') as unknown as NotesCollection
  const result = await collection.create({ dir_id: dirId })
  const data = result.data
  const id = data._id ?? data.id
  if (!id) throw new Error('Note creation returned no id')
  return { _id: id, name: data.attributes?.name }
}
