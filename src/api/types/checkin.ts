import type { V2ResponseData } from '@/api/types'

/**
 * The checkin API (https://shopee.tw/mkt/coins/api/v2/checkin_new) response data type.
 */
export type CheckinResponseData = V2ResponseData<Data>

interface Data {
  '@timestamp': Date
  'check_in_day': number
  'checkin_list': [number, number, number, number, number, number, number] | null
  'dataview_type': string
  'deviceid': string
  'devicetype': string
  'err_msg': string
  'increase_coins': number
  'increase_time': number
  'ip_addr': string
  'logid': string
  'rule_id': number
  'success': boolean
  'timestamp': number
  'today_index': number
  'userid': string
  'username': string
}
