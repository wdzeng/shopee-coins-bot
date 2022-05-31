import fs from 'fs/promises'
import {
  Builder, By, IWebDriverOptionsCookie, until, WebDriver, error, Browser
} from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import logger from 'loglevel'
import { xpathByText } from './util'

const urlHome = 'https://shopee.tw/'
const urlLogin = 'https://shopee.tw/buyer/login?from=https%3A%2F%2Fshopee.tw%2Fuser%2Fcoin&next=https%3A%2F%2Fshopee.tw%2Fshopee-coins'
const urlCoin = 'https://shopee.tw/shopee-coins'
const txtWrongPassword = '你的帳號或密碼不正確，請再試一次'
const txtPlayPuzzle = '點擊以重新載入頁面'
const txtUseLink = '使用連結驗證'
const txtReceiveCoin = '今日簽到獲得'
const txtTooMuchTry = '您已達到今日驗證次數上限。'
const txtShopeeReward = '蝦幣獎勵'
const txtCoinReceived = '明天再回來領取'
const waitTimeout = 2 * 60 * 1000 // 2 minutes

export const EXIT_CODE_SUCCESS = 0
export const EXIT_CODE_ALREADY_RECEIVED = 1
export const EXIT_CODE_NEED_SMS_AUTH = 2
export const EXIT_CODE_CANNOT_SOLVE_PUZZLE = 3
export const EXIT_CODE_OPERATION_TIMEOUT_EXCEEDED = 4
export const EXIT_CODE_TOO_MUCH_TRY = 69
export const EXIT_CODE_WRONG_PASSWORD = 87

export default class TaiwanShopeeBot {
  // @ts-ignore
  private driver: WebDriver

  constructor(
    private username: string | undefined,
    private password: string | undefined,
    private pathCookie: string | undefined
  ) { }

  private async tryLogin(): Promise<number | undefined> {
    logger.debug('Start to check if user is already logged in.')
    await this.driver.get(urlLogin)

    // TODO wait redirect?
    await new Promise(res => setTimeout(res, 4000))
    const curUrl = await this.driver.getCurrentUrl()
    logger.debug('Current at url: ' + curUrl)
    if (curUrl === urlCoin) {
      // Already logged in.
      logger.info('Already logged in.')
      return
    }

    // Not logged in; try to login by password.
    if (!this.username || !this.password) {
      logger.error('Failed to login. Missing username or password.')
      return EXIT_CODE_WRONG_PASSWORD
    }

    logger.info('Try to login by username and password.')

    // Fill username and password inputs.
    const inputUsername = await this.driver.findElement(By.name('loginKey'))
    await inputUsername.sendKeys(this.username)
    const inputPassword = await this.driver.findElement(By.name('password'))
    await inputPassword.sendKeys(this.password)

    // Submit form.
    const btnLogin = await this.driver.findElement(By.xpath(xpathByText('button', '登入')))
    // Wait until the login button is enabled.
    await this.driver.wait(until.elementIsEnabled(btnLogin), waitTimeout)
    await btnLogin.click()
    logger.debug('Login form submitted.')

    // Wait for something happens.
    const xpath = [
      xpathByText('div', txtWrongPassword),
      xpathByText('button', txtPlayPuzzle),
      xpathByText('div', txtUseLink),
      xpathByText('div', txtTooMuchTry),
      xpathByText('div', txtShopeeReward),
    ].join('|')
    const result = await this.driver.wait(until.elementLocated(By.xpath(xpath)), waitTimeout)
    const text = await result.getText()

    if (text === txtShopeeReward) {
      // success
      logger.info('Login succeeded.')
      return
    }
    if (text === txtWrongPassword) {
      // invalid password
      logger.error('Login failed: wrong password.')
      return EXIT_CODE_WRONG_PASSWORD
    }
    if (text === txtPlayPuzzle) {
      // TODO: not know if this occurred in 2022/05
      // need to play puzzle
      logger.error('Login failed: I cannot solve the puzzle.')
      return EXIT_CODE_CANNOT_SOLVE_PUZZLE
    }
    if (text === txtUseLink) {
      // need to authenticate via SMS link
      logger.warn('Login failed: please login via SMS.')
      return EXIT_CODE_NEED_SMS_AUTH
    }

    // Unknown error
    logger.debug(`Unexpected error occurred. Fetched text by xpath: ${text}`)
    throw new Error('Unknown error occurred when trying to login.')
  }

  private async tryReceiveCoin(): Promise<number> {
    const xpath = `${xpathByText('button', txtReceiveCoin)} | ${xpathByText('button', txtCoinReceived)}`
    await this.driver.wait(until.elementLocated(By.xpath(xpath)), waitTimeout)
    const btnReceiveCoin = await this.driver.findElement(By.xpath(xpath))

    // Check if coin is already received today
    const text = await btnReceiveCoin.getText()
    if (text.startsWith(txtCoinReceived)) {
      // Already received
      logger.info('Coin already received.')
      return EXIT_CODE_ALREADY_RECEIVED
    }

    await btnReceiveCoin.click()
    await this.driver.wait(until.elementLocated(By.xpath(xpathByText('button', txtCoinReceived))))

    logger.info('Coin received.')
    return EXIT_CODE_SUCCESS
  }

  private async tryLoginWithSmsLink(): Promise<number | undefined> {
    // Wait until the '使用連結驗證' is available.
    await this.driver.wait(until.elementLocated(By.xpath(xpathByText('div', txtUseLink))), waitTimeout)

    // Click the '使用連結驗證' button.
    const btnLoginWithLink = await this.driver.findElement(By.xpath(xpathByText('div', txtUseLink)))
    await btnLoginWithLink.click()

    // Wait until the page is redirect
    await this.driver.wait(until.urlIs('https://shopee.tw/verify/link'))

    // Check if reach daily limit.
    const reachLimit = await this.driver.findElements(By.xpath(xpathByText('div', txtTooMuchTry)))
    if (reachLimit.length > 0) {
      // Failed because reach limit.
      logger.error('Cannot use SMS link to login: reach daily limits.')
      return EXIT_CODE_TOO_MUCH_TRY
    }

    // Now user should click the link sent from Shopee to her mobile via SMS.
    // Wait for user completing the process; by the time the website should be
    // redirected to coin page.
    logger.info('An SMS message is sent to your mobile. Please click the link in 10 minutes. I will wait for you...')
    try {
      await this.driver.wait(until.urlIs(urlCoin), 10 * 60 * 1000) // timeout is 10min
    } catch (e: unknown) {
      if (e instanceof error.TimeoutError) {
        logger.error('You are too slow. Bye bye.')
      }
      throw e
    }

    // TODO: check if login is denied.
    logger.info('Login permitted.')
    return
  }

  private async saveCookies(): Promise<void> {
    logger.debug('Start to save cookie.')

    try {
      const cookies = await this.driver.manage().getCookies()
      await fs.writeFile(this.pathCookie!, JSON.stringify(cookies))
      logger.info('Cookie saved.')
    } catch (e: unknown) {
      // suppress error.
      if (e instanceof Error) {
        logger.warn('Failed to save cookie: ' + e.message)
      }
      else {
        logger.warn('Failed to save cookie.')
      }
    }
  }

  private async loadCookies(): Promise<void> {
    logger.debug('Start to load cookies.')

    // Connect to dummy page.
    await this.driver.get(urlHome)

    // Try to load cookies.
    try {
      const cookiesStr = await fs.readFile(this.pathCookie!, 'utf-8')
      const cookies: IWebDriverOptionsCookie[] = JSON.parse(cookiesStr)
      const tasks = cookies.map((cookie) => this.driver.manage().addCookie(cookie))
      await Promise.all(tasks)
      logger.info('Cookies loaded.')
    } catch (e: unknown) {
      // Cannot load cookies; ignore. This may be due to invalid cookie string
      // pattern.
      if (e instanceof Error) {
        logger.debug('Failed to load cookies: ' + e.message)
      }
      else {
        logger.debug('Failed to load cookies.')
      }
    }
  }

  private async initDriver(): Promise<void> {
    const options = new chrome.Options()
    options
      .addArguments('--start-maximized')
      .addArguments('--headless')
      .addArguments('--disable-extensions')
      .addArguments('--no-sandbox')
      .addArguments('--disable-dev-shm-usage')
      .addArguments('--disable-gpu')
    if (process.env['DEBUG']) {
      options.addArguments('--remote-debugging-port=9222')
    }

    this.driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build()
  }

  async run(disableSmsLogin: boolean): Promise<number> {
    await this.initDriver()

    try {
      if (this.pathCookie !== undefined) {
        await this.loadCookies()
      }
      else {
        logger.info('No cookies given. Will try to login using username and password.')
      }

      let result: number | undefined = await this.tryLogin()
      if (result === EXIT_CODE_NEED_SMS_AUTH) {
        // Login failed. Try use the SMS link to login.
        if (disableSmsLogin) {
          logger.error('SMS authentication is required.')
          return result
        }
        else {
          result = await this.tryLoginWithSmsLink()
        }
      }

      if (result !== undefined) {
        // Failed to login.
        return result
      }

      // Now we are logged in.

      // Save cookies.
      if (this.pathCookie !== undefined) {
        await this.saveCookies() // never raise error
      }

      // Receive coins.
      return await this.tryReceiveCoin()
    }
    catch (e: unknown) {
      if (e instanceof error.TimeoutError) {
        logger.error('Operation timeout exceeded.')
        return EXIT_CODE_OPERATION_TIMEOUT_EXCEEDED
      }
      // Unknown error.
      throw e
    }
    finally {
      await this.driver.close()
    }
  }
}
