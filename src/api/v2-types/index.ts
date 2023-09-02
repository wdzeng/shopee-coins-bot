export type ApiV2Response<D> = ApiV2ErrorResponse | ApiV2SuccessfulResponse<D>

export interface ApiV2ErrorResponse {
  code: number
  msg: string
}

export interface ApiV2SuccessfulResponse<D> {
  code: 0
  msg: 'success'
  data: D
}
