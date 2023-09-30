import fs from 'node:fs'

import { handleError } from '@/cli/error'
import ExitCode from '@/cli/exit-code'
import * as logger from '@/cli/log'

let loadedCookie: string | undefined = undefined

export function loadCookie(path: string): void {
  let cookieContent: string
  try {
    cookieContent = fs.readFileSync(path, 'utf8')
  } catch (e: unknown) {
    handleError(e)
  }

  const lines = cookieContent.split('\n')
  if (lines.length === 0) {
    logger.error('Cookie is empty.')
    process.exit(ExitCode.INVALID_COOKIE)
  }

  // @ts-expect-error: lines[1] is string
  if (lines.length > 2 || (lines.length === 2 && lines[1].length > 0)) {
    logger.warn('Found more than one lines in cookie file; only the first line will be read.')
  }
  // @ts-expect-error: lines[0] is string
  const cookie: string = lines[0]

  if (cookie.length === 0) {
    logger.error('Cookie is empty.')
    process.exit(ExitCode.INVALID_COOKIE)
  }

  loadedCookie = cookie
}

export function getCookie(): string {
  if (loadedCookie === undefined) {
    throw new Error('Please load cookie first.')
  }
  return loadedCookie
}
