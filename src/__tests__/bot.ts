// Test bot operations

import crypto from 'node:crypto'
import fs from 'node:fs'
import { describe, expect, test } from '@jest/globals'
import { isPng, testIf } from './utils'
import { ExitCode } from '../exit-code'
import Bot from '../tw-shopee-bot'

const TIMEOUT_LOGIN = 20 * 1000 // 20s

function generateRandomString() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const randomBytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    const index = randomBytes[i] % chars.length;
    result += chars[index];
  }
  return result;
}

async function testLoginWithDummyUserInfo(screenshotPath: undefined | string) {
  const dummyUsername = generateRandomString()
  const dummyPassword = generateRandomString()
  const bot = new Bot(dummyUsername, dummyPassword, undefined)
  const exitCode = await bot.run(true, true, false, screenshotPath)
  expect(exitCode).toBe(ExitCode.WRONG_PASSWORD)
}

describe('login', () => {
  test(
    'bot cannot login with a wrong username or password',
    () => testLoginWithDummyUserInfo(undefined),
    TIMEOUT_LOGIN
  )

  test(
    'bot cannot login with an invalid cookie',
    async () => {
      const cookie = 'dummycookie'
      const bot = new Bot(undefined, undefined, cookie)
      const exitCode = await bot.run(true, true, false, undefined)
      expect(exitCode).toBe(ExitCode.WRONG_PASSWORD)
    },
    TIMEOUT_LOGIN
  )

  testIf(
    false,
    // Boolean(
    //   (process.env['SHOPEE_USERNAME'] && process.env['SHOPEE_PASSWORD']) ||
    //   process.env['GITHUB_ACTIONS']
    // ),
    'bot can login with correct username and password',
    async () => {
      const bot = new Bot(
        process.env['SHOPEE_USERNAME'],
        process.env['SHOPEE_PASSWORD'],
        undefined
      )
      const exitCode = await bot.run(true, true, false, undefined)
      expect([ExitCode.NEED_SMS_AUTH, ExitCode.NEED_EMAIL_AUTH]).toContain(
        exitCode
      )
    },
    TIMEOUT_LOGIN
  )
})

describe('screenshot', () => {
  test(
    'bot can save a screenshot',
    async () => {
      const screenshotPath = '/tmp/screenshot.png'
      fs.rmSync(screenshotPath, { force: true })
      expect(fs.existsSync(screenshotPath)).toBe(false)
      await testLoginWithDummyUserInfo('/tmp')
      expect(isPng(screenshotPath)).toBe(true)
    },
    TIMEOUT_LOGIN
  )
})
