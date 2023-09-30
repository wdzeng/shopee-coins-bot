/**
 * The v1 API response data type.
 */
export type V1ResponseData<D> = D | ErrorResponseData

/**
 * The v2 API response data type.
 */
export type V2ResponseData<D> = V2SuccessfulResponseData<D> | ErrorResponseData

/**
 * Error data type when the API returns non-successful response in v1 or v2 API. This happens when
 * the status code is 2XX or 4XX.
 */
export interface ErrorResponseData {
  code: number // Non-zero.
  msg: string // A string other than 'success'.
}

/**
 * Data type when the API returns successful response in v2 API. This assures the status code is
 * 2XX.
 */
export interface V2SuccessfulResponseData<D> {
  code: 0
  msg: 'success'
  data: D
}
