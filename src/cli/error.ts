import { InvalidCookieError, ShopeeError, UserNotLoggedInError } from '@/api/errors'
import ExitCode from '@/cli/exit-code'
import * as logger from '@/cli/log'

export function handleError(e: unknown): never {
  if (e instanceof InvalidCookieError) {
    logger.error('Invalid cookie.')
    process.exit(ExitCode.INVALID_COOKIE)
  }

  if (e instanceof UserNotLoggedInError) {
    logger.error('You are not logged in. Is your cookie expired?')
    process.exit(ExitCode.LOGIN_DENIED)
  }

  if (e instanceof ShopeeError) {
    logger.error('Shopee server: %s', e.message)
    logger.debug('Error code: %d', e.code)
    process.exit(ExitCode.UNKNOWN_ERROR)
  }

  // Unexpected error.
  if (e instanceof Error && e.stack) {
    logger.debug('%s', e.stack)
  }
  const errMsg: unknown = e instanceof Error ? e.message : e
  logger.error('Unexpected error: %s', typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg))
  process.exit(ExitCode.UNKNOWN_ERROR)
}
