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
  // Mirrors the real native module: resetShareIntent() consumes the share,
  // so a subsequent read sees hasShareIntent: false. This is what makes a
  // remount-loses-state bug observable — a fresh instance re-reading a
  // mock that stayed `true` forever would just re-stage and mask the bug.
  reset: jest.fn(() => {
    mockShareState.hasShare = false
  })
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

// Stands in for CozyProvider, which app/_layout.tsx conditionally wraps
// `content` in once `client` becomes truthy — an element-type change at
// whatever tree position it occupies.
const Wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>

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

// Regression test for a bug where PendingShareProvider sat INSIDE
// app/_layout.tsx's `client ? <CozyProvider>{content}</CozyProvider> : content`
// conditional. When `client` transitioned null -> object (every login, and
// even cold start with a saved session), the element type at that return
// position changed, so React unmounted/remounted the whole subtree —
// wiping PendingShareProvider's `pending` state before the share could be
// resumed after login. The fix hoists PendingShareProvider to wrap the
// ENTIRE conditional instead, so its own position never changes.
//
// The test above can't catch this by construction: it always renders
// PendingShareProvider directly at the root across both render and
// rerender, so it is never itself a descendant of a type-changing element.
// This test instead mirrors the FIXED topology — PendingShareProvider as
// the outer element, with a type-changing conditional as its *child* — and
// proves `pending` survives that child's element-type change.
test('keeps staged share across the auth transition when hoisted above a type-changing conditional (regression)', async () => {
  mockShareState.items = [{ uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }]
  mockShareState.hasShare = true

  const renderHarness = (cond: boolean) => (
    <PendingShareProvider>
      {cond ? (
        <Wrapper>
          <Probe />
        </Wrapper>
      ) : (
        <Probe />
      )}
    </PendingShareProvider>
  )

  const { rerender, getByText } = render(renderHarness(false))
  await waitFor(() => expect(getByText('count:1')).toBeTruthy())
  expect(mockPush).not.toHaveBeenCalled() // no client yet

  mockAuthState.client = {} // "login" happened
  // Only the child's element type changes here (Wrapper now wraps Probe,
  // mirroring CozyProvider mounting) — PendingShareProvider itself keeps
  // the same type/position, so it must not remount.
  rerender(renderHarness(true))

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/import'))
})
