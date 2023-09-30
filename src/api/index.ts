import axios, { type AxiosResponse } from 'axios'

import { parseCookie } from '@/api/cookie'
import {
  InvalidCookieError,
  UnexpectedResponseError,
  handleErrorResponse,
  validateV2ApiResponseData
} from '@/api/errors'
import type { CheckinResponseData } from '@/api/types/checkin'
import type { CoinsResponseData } from '@/api/types/coins'
import type { SettingsResponseData } from '@/api/types/settings'

export interface CheckinHistory {
  amounts: [number, number, number, number, number, number, number]
  checkedInToday: boolean
  todayIndex: number
}

export default class ShopeeBot {
  constructor(private readonly cookie: string) {}

  private async getCoinsApiResponseBody(): Promise<CoinsResponseData> {
    const url = 'https://shopee.tw/mkt/coins/api/v1/cs/coins'
    const headers = {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.8',
      'cache-control': 'no-cache',
      'cookie': this.cookie,
      'pragma': 'no-cache',
      'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    }

    try {
      const response = await axios<CoinsResponseData>(url, { headers })
      return response.data
    } catch (e: unknown) {
      handleErrorResponse(e)
    }
  }

  /**
   * Do checkin.
   *
   * @returns the amount of coins you get, or `false` if you have already checked in today.
   */
  async checkin(): Promise<number | false> {
    const checkinApiUrl = 'https://shopee.tw/mkt/coins/api/v2/checkin_new'
    const cookieItems = parseCookie(this.cookie)
    if (!cookieItems.shopee_webUnique_ccd) {
      throw new InvalidCookieError('Missing required cookie: shopee_webUnique_ccd')
    }
    const dfp = decodeURIComponent(cookieItems.shopee_webUnique_ccd)
    const requestBody = JSON.stringify({ dfp })

    let response
    const headers = {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json;charset=UTF-8',
      'cookie': this.cookie,
      'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    }
    try {
      response = await axios.post<CheckinResponseData>(checkinApiUrl, requestBody, { headers })
    } catch (e: unknown) {
      handleErrorResponse(e)
    }

    validateV2ApiResponseData(response.data)
    return response.data.data.success ? response.data.data.increase_coins : false
  }

  /**
   * Get your balance of coins.
   *
   * @returns the balance of coins.
   */
  async getBalance(): Promise<number> {
    const data = await this.getCoinsApiResponseBody()
    return data.coins
  }

  async getCheckinHistory(): Promise<CheckinHistory> {
    const settingsApiUrl = 'https://shopee.tw/mkt/coins/api/v2/settings'
    const headers = {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.8',
      'cache-control': 'no-cache',
      'cookie': this.cookie,
      'pragma': 'no-cache',
      'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    }

    let response: AxiosResponse<SettingsResponseData>
    try {
      response = await axios<SettingsResponseData>(settingsApiUrl, { headers })
    } catch (e: unknown) {
      handleErrorResponse(e)
    }

    validateV2ApiResponseData(response.data)

    if (response.data.data.checkin_list.length < 7) {
      // Unexpected checkin history length.
      throw new UnexpectedResponseError(response.data.code, 'Unexpected checkin history length.')
    }

    return {
      // @ts-expect-error: length of `checkin_list` is always 7
      amounts: response.data.data.checkin_list.slice(0, 7),
      checkedInToday: response.data.data.checked_in_today,
      todayIndex: response.data.data.today_index - 1
    }
  }

  async getLoginUser(): Promise<string> {
    const data = await this.getCoinsApiResponseBody()
    return data.username
  }
}
