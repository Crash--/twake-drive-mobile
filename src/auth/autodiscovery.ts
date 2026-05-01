import { TwakeConfiguration } from './types'

export const extractDomain = (email: string): string | null => {
  if (!email) return null
  const trimmed = email.trim()
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex === -1) return null
  const domain = trimmed.substring(atIndex + 1)
  return domain.length > 0 ? domain : null
}

export const fetchTwakeConfiguration = async (
  domain: string
): Promise<TwakeConfiguration | null> => {
  const url = `https://${domain}/.well-known/twake-configuration`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    })
    if (!response.ok) return null
    return (await response.json()) as TwakeConfiguration
  } catch {
    return null
  }
}
