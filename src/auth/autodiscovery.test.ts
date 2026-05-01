import nock from 'nock'

import { extractDomain, fetchTwakeConfiguration } from './autodiscovery'

describe('extractDomain', () => {
  it('returns the domain part of a valid email', () => {
    expect(extractDomain('user@example.com')).toBe('example.com')
  })

  it('handles emails with subdomains', () => {
    expect(extractDomain('user@mail.example.com')).toBe('mail.example.com')
  })

  it('returns null for an empty string', () => {
    expect(extractDomain('')).toBeNull()
  })

  it('returns null for a string without @', () => {
    expect(extractDomain('not-an-email')).toBeNull()
  })

  it('trims whitespace', () => {
    expect(extractDomain('  user@example.com  ')).toBe('example.com')
  })

  it('uses the last @ if multiple are present', () => {
    expect(extractDomain('weird@@example.com')).toBe('example.com')
  })
})

describe('fetchTwakeConfiguration', () => {
  afterEach(() => nock.cleanAll())

  it('returns the parsed configuration on 200', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .reply(200, { 'twake-flagship-login-uri': 'https://login.example.com/oauth' })

    const result = await fetchTwakeConfiguration('example.com')
    expect(result).toEqual({ 'twake-flagship-login-uri': 'https://login.example.com/oauth' })
  })

  it('returns null on non-200 response', async () => {
    nock('https://example.com').get('/.well-known/twake-configuration').reply(404)
    const result = await fetchTwakeConfiguration('example.com')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .replyWithError('boom')
    const result = await fetchTwakeConfiguration('example.com')
    expect(result).toBeNull()
  })
})
