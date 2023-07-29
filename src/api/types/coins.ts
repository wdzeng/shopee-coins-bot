// Response from API https://shopee.tw/mkt/coins/api/v1/cs/coins

export type UnknownCoinsResponse = CoinsResponse | ErrorCoinsResponse

export interface CoinsResponse {
  coins: number
  logid: string
  ts: number
  userid: string
  username: string
}

export interface ErrorCoinsResponse {
  code: number // 401 indicated invalid cookie
  msg: string
}
