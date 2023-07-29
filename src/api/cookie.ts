import { InvalidCookieError } from '@/api/errors'

export function parseCookie(cookie: string): Record<string, string> {
  return cookie.split(';').reduce<Record<string, string>>((acc, cookieString) => {
    const [key, value] = cookieString.split('=').map((s) => s.trim())
    if (!key) {
      throw new InvalidCookieError('Invalid cookie string: missing key')
    }
    if (!value) {
      throw new InvalidCookieError('Invalid cookie string: missing value')
    }
    acc[key] = value
    return acc
  }, {})
}
