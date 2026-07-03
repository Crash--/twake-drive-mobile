import React from 'react'
import { Text } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'

// Jest's module-factory hoisting only allows out-of-scope variable access for
// names prefixed with `mock` (case-insensitive) — see babel-plugin-jest-hoist.
// Hence mockPush/mockShareState/mockAuthState rather than the more natural
// pushMock/shareState/authState.
const mockPush = jest.fn()
const mockShareState = {
  items: [] as unknown[],
  text: undefined as string | undefined,
  hasShare: false,
  reset: jest.fn()
}
const mockAuthState = { client: null as unknown }

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/useAuth', () => ({ useAuth: () => mockAuthState }))
jest.mock('@/share/useIncomingShare', () => ({ useIncomingShare: () => mockShareState }))

import { PendingShareProvider, usePendingShare } from './PendingShareProvider'

const Probe = () => {
  const { items } = usePendingShare()
  return <Text>count:{items.length}</Text>
}

beforeEach(() => {
  mockPush.mockReset()
  mockShareState.items = []
  mockShareState.text = undefined
  mockShareState.hasShare = false
  mockAuthState.client = null
})

test('does not navigate while unauthenticated, then navigates after login', async () => {
  mockShareState.items = [{ uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }]
  mockShareState.hasShare = true
  const { rerender, getByText } = render(
    <PendingShareProvider>
      <Probe />
    </PendingShareProvider>
  )
  await waitFor(() => expect(getByText('count:1')).toBeTruthy())
  expect(mockPush).not.toHaveBeenCalled() // no client yet

  mockAuthState.client = {} // "login" happened
  rerender(
    <PendingShareProvider>
      <Probe />
    </PendingShareProvider>
  )
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/import'))
})
