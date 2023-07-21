// Response from API https://shopee.tw/mkt/coins/api/v2/settings

export interface SettingsResponse {
  code: number
  msg: string
  data: Data
}

interface Data {
  '@timestamp': Date
  'activity_id': number
  'asset_setting': string
  'checked_in_today': boolean
  'checked_in_today_amount': number
  'checkin_list': [number, number, number, number, number, number, number]
  'dataview_type': string
  'deviceid': string
  'devicetype': string
  'fraud_detected': boolean
  'highlight': number[]
  'ip_addr': string
  'last_prize_type': number
  'logid': string
  'login': boolean
  'slot_id': number
  'subscribe': boolean
  'timestamp': number
  'today_index': number
  'uniqueid': string
  'userid': string
  'username': string
}
