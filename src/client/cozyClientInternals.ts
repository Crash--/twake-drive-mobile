import type CozyClient from 'cozy-client'

type StoredDoc = { _id: string } & Record<string, unknown>

// cozy-client's event emitter (MicroEE) and store helpers aren't part of its
// public typings. These narrow wrappers keep the untyped access in a single,
// documented place instead of scattering `as any` at each call site.

interface CozyClientEmitter {
  on(event: string, listener: () => void): void
  removeListener(event: string, listener: () => void): void
}

interface CozyClientStore {
  setData(data: Record<string, StoredDoc[]>): void
  getDocumentFromState(doctype: string, id: string): StoredDoc | null | undefined
}

export const clientEmitter = (client: CozyClient): CozyClientEmitter =>
  client as unknown as CozyClientEmitter

export const clientStore = (client: CozyClient): CozyClientStore =>
  client as unknown as CozyClientStore
