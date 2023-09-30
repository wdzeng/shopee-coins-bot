import { AxiosError } from 'axios'
import { CustomError } from 'ts-custom-error'

import type { V2ResponseData, V2SuccessfulResponseData } from '@/api/types'

/**
 * Ther error is thrown when a user provides invalid cookie. An invalid cookie means the cookie
 * string itself cannot be parsed or contains unexpected token.
 */
export class InvalidCookieError extends CustomError {}

/**
 * The error is thrown when a user does not login. This often happens when the cookie provided is
 * expired or the authentication information in it is rejected by the Shopee backend.
 */
export class UserNotLoggedInError extends CustomError {
  constructor() {
    super('User is not logged in.')
  }
}

/**
 * The error is thrown when the Shopee backend return 2XX status code, but with unexpected response
 * data.
 */
export class UnexpectedResponseError extends CustomError {
  constructor(
    public readonly code: number,
    msg: string
  ) {
    super(msg)
  }
}

/**
 * Handles the error thrown by Axios. If the error is an AxiosError, it will check the status code.
 */
export function handleErrorResponse(e: unknown): never {
  if (e instanceof AxiosError) {
    const statusCode = e.response?.status
    if (statusCode === 401 || statusCode === 403) {
      throw new UserNotLoggedInError()
    }
  }

  // Unknown error. Just throw it. It is caller's responsibility to handle it and display
  // human-readable messages.
  throw e
}

/**
 * Validates the data returns from the v2 API. If the data is not valid, it will throw an error.
 */
export function validateV2ApiResponseData<D>(
  responseData: V2ResponseData<D>
): asserts responseData is V2SuccessfulResponseData<D> {
  if (
    typeof responseData === 'object' &&
    'code' in responseData &&
    typeof responseData.code === 'number' &&
    'msg' in responseData &&
    typeof responseData.msg === 'string'
  ) {
    if (responseData.code === 401 || responseData.code === 403) {
      throw new UserNotLoggedInError()
    } else if (responseData.code !== 0) {
      throw new UnexpectedResponseError(responseData.code, `Shopee backend: ${responseData.msg}`)
    }

    if (
      'data' in responseData &&
      typeof responseData.data === 'object' &&
      responseData.data !== null &&
      'userid' in responseData.data &&
      responseData.data.userid === '-1'
    ) {
      // Sometimes the backend returns 2XX even if the user is not logged in. Instead, it set -1 as
      // the user ID.
      throw new UserNotLoggedInError()
    }
  }

  // The response data is good.
}
