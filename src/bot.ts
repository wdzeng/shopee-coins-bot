import logger from 'loglevel'

import type { CheckinResponse } from '@/api-types/checkin'
import type { CoinsResponse, UnknownCoinsResponse } from '@/api-types/coins'
import type { SettingsResponse } from '@/api-types/settings'
import { parseCookie } from '@/cookie'
import { InvalidCookieError, UserNotLoggedInError } from '@/errors'

export interface CheckinHistory {
  amounts: [number, number, number, number, number, number, number]
  checkedInToday: boolean
  todayIndex: number
}

export default class ShopeeBot {
  constructor(private readonly cookie: string) {}

  private async getCoinsApiResponseBody(): Promise<CoinsResponse> {
    const url = 'https://shopee.tw/mkt/coins/api/v1/cs/coins'
    const fetchResult = await fetch(url, {
      method: 'GET',
      // eslint-disable-next-line unicorn/no-null
      body: null,
      headers: {
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
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: UnknownCoinsResponse = await fetchResult.json()
    if ('code' in result) {
      if (result.code === 401) {
        throw new InvalidCookieError(`Shopee server: ${result.msg}`)
      }

      // Unexpected error.
      throw new Error(`Shopee server: ${result.msg}`)
    }

    return result
  }

  async checkin(): Promise<number | false> {
    const checkinApiUrl = 'https://shopee.tw/mkt/coins/api/v2/checkin_new'
    const cookieItems = parseCookie(this.cookie)
    if (!cookieItems.shopee_webUnique_ccd) {
      throw new InvalidCookieError('Missing required cookie: shopee_webUnique_ccd')
    }
    const dfp = decodeURIComponent(cookieItems.shopee_webUnique_ccd)
    const requestBody = JSON.stringify({ dfp })
    const fetchResult = await fetch(checkinApiUrl, {
      method: 'POST',
      body: requestBody,
      headers: {
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
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const responseBody: CheckinResponse = await fetchResult.json()
    return responseBody.data.success ? responseBody.data.increase_coins : false
  }

  async getBalance(): Promise<number> {
    const coinsResponseBody = await this.getCoinsApiResponseBody()
    logger.debug(coinsResponseBody)
    return coinsResponseBody.coins
  }

  async getCheckinHistory(): Promise<CheckinHistory> {
    const settingsApiUrl = 'https://shopee.tw/mkt/coins/api/v2/settings'
    const fetchResult = await fetch(settingsApiUrl, {
      method: 'GET',
      // eslint-disable-next-line unicorn/no-null
      body: null,
      headers: {
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
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body: SettingsResponse = await fetchResult.json()

    if (body.data.userid === '-1') {
      throw new UserNotLoggedInError()
    }

    return {
      amounts: body.data.checkin_list,
      checkedInToday: body.data.checked_in_today,
      todayIndex: body.data.today_index - 1
    }
  }

  async getLoginUser(): Promise<string> {
    const body = await this.getCoinsApiResponseBody()
    if (body.userid === '-1') {
      throw new UserNotLoggedInError()
    }
    return body.username
  }
}
