import fs from 'fs/promises'
import path from 'path'
import {
  Builder, By, IWebDriverOptionsCookie, until, WebDriver, error, Browser
} from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import logger from 'loglevel'
import { /* isValidPassword, */ xpathByText } from './util'

const txtUseLink = '使用連結驗證'
const txtReceiveCoin = '今日簽到獲得'
const txtShopeeReward = '蝦幣獎勵'
const txtTooMuchTry = '您已達到今日驗證次數上限。'
const txtCoinReceived = '明天再回來領取'
const waitTimeout = 2 * 60 * 1000 // 2 minutes

export const EXIT_CODE_SUCCESS = 0
export const EXIT_CODE_ALREADY_RECEIVED = 1
export const EXIT_CODE_NEED_SMS_AUTH = 2
export const EXIT_CODE_CANNOT_SOLVE_PUZZLE = 3
export const EXIT_CODE_OPERATION_TIMEOUT_EXCEEDED = 4
export const EXIT_CODE_NEED_EMAIL_AUTH = 5
export const EXIT_CODE_TOO_MUCH_TRY = 69
export const EXIT_CODE_WRONG_PASSWORD = 87
export const EXIT_CODE_WRONG_UNKNOWN = 88

interface ShopeeCredential {
  username: string | undefined
  password: string | undefined
  cookies: IWebDriverOptionsCookie[]
}

export default class TaiwanShopeeBot {
  // @ts-ignore
  private driver: WebDriver

  constructor(
    private username: string | undefined,
    private password: string | undefined,
    private pathCookie: string | undefined
  ) { }

  private async tryLogin(): Promise<number | undefined> {
    logger.info('Start to login shopee.')

    // Go to the login page. If the user is already logged in, the webpage
    // will be soon redirected to the coin check-in page. Since the login form
    // still shows temporarily in this case, we could not determine if the user
    // is not logged in even if the login form appears. An alternative way is
    // to wait for a delay (4s), and if the webpage stays at the login page, we
    // assert that the user is not logged in.
    const urlLogin = 'https://shopee.tw/buyer/login?from=https%3A%2F%2Fshopee.tw%2Fuser%2Fcoin&next=https%3A%2F%2Fshopee.tw%2Fshopee-coins'
    await this.driver.get(urlLogin)
    await new Promise(res => setTimeout(res, 4000))
    const curUrl = await this.driver.getCurrentUrl()
    logger.debug('Current at url: ' + curUrl)

    const urlCoin = 'https://shopee.tw/shopee-coins'
    if (curUrl === urlCoin) {
      // The webpage is redirected to the coin check-in page and therefore
      // the user must have been logged in.
      logger.info('Already logged in.')
      return
    }
    // The webpage stays at the login page after the delay (4s). We assert that
    // the user is not logged in.

    // If username or password is not specified, the login fails.
    if (!this.username || !this.password) {
      logger.error('Failed to login. Missing username or password.')
      return EXIT_CODE_WRONG_PASSWORD
    }
    // if (!isValidPassword(this.password)) {
    //   logger.error('Login failed: wrong password.')
    //   process.exit(EXIT_CODE_WRONG_PASSWORD)
    // }

    // Now try to fill the login form and submit it.

    logger.info('Try to login by username and password.')

    // Fill username and password inputs.
    const inputUsername = await this.driver.findElement(By.name('loginKey'))
    await inputUsername.sendKeys(this.username)
    const inputPassword = await this.driver.findElement(By.name('password'))
    await inputPassword.sendKeys(this.password)

    // Submit form.
    // Wait until the login button is enabled.
    const btnLogin = await this.driver.findElement(By.xpath(xpathByText('button', '登入')))
    await this.driver.wait(until.elementIsEnabled(btnLogin), waitTimeout)
    btnLogin.click() // do not await for this click since it may hang = =
    logger.info('Login form submitted. Waiting for redirect.')

    const txtWrongPasswords = [
      '你的帳號或密碼不正確，請再試一次',
      '登入失敗，請稍後再試或使用其他登入方法',
      '您輸入的帳號或密碼不正確，若遇到困難，請重設您的密碼。'
    ]
    const txtPlayPuzzle = '點擊以重新載入頁面'
    const txtEmailAuth = '透過電子郵件連結驗證'

    // Wait for something happens.
    const xpath = [
      ...txtWrongPasswords.map(e => xpathByText('div', e)),
      xpathByText('button', txtPlayPuzzle),
      xpathByText('div', txtUseLink),
      xpathByText('div', txtTooMuchTry),
      xpathByText('div', txtShopeeReward),
      xpathByText('div', txtEmailAuth)
    ].join('|')
    const result = await this.driver.wait(until.elementLocated(By.xpath(xpath)), waitTimeout)
    const text = await result.getText()

    if (text === txtShopeeReward) {
      // success
      logger.info('Login succeeded.')
      return
    }
    if (txtWrongPasswords.includes(text)) {
      // invalid password
      logger.error('Login failed: wrong password.')
      return EXIT_CODE_WRONG_PASSWORD
    }
    if (text === txtPlayPuzzle) {
      // need to play puzzle
      logger.error('Login failed: I cannot solve the puzzle.')
      return EXIT_CODE_CANNOT_SOLVE_PUZZLE
    }
    if (text === txtUseLink) {
      // need to authenticate via SMS link
      logger.warn('Login failed: please login via SMS.')
      return EXIT_CODE_NEED_SMS_AUTH
    }
    if (text === txtEmailAuth) {
      // need to authenticate via email; this is currently not supported
      logger.error('Login failed: need email Auth')
      return EXIT_CODE_NEED_EMAIL_AUTH
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
    logger.warn('An SMS message is sent to your mobile. Once you click the link I will keep going. I will wait for you and please complete it in 10 minutes.')
    try {
      await this.driver.wait(until.urlMatches(/^https:\/\/shopee.tw\/shopee-coins(\?.*)?$/), 10 * 60 * 1000) // timeout is 10min
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

  private async saveCookies(ignorePassword: boolean): Promise<void> {
    logger.info('Start to save cookie.')

    try {
      const cookies = await this.driver.manage().getCookies()
      const json: ShopeeCredential = {
        username: ignorePassword ? undefined : this.username,
        password: ignorePassword ? undefined : this.password,
        cookies
      }

      await fs.writeFile(this.pathCookie!, JSON.stringify(json))
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

  private async loadCookies(ignorePassword: boolean): Promise<void> {
    logger.info('Start to load cookies.')

    // Connect to dummy page.
    const urlHome = 'https://shopee.tw/'
    await this.driver.get(urlHome)

    // Try to load cookies.
    try {
      const cookiesStr = await fs.readFile(this.pathCookie!, 'utf-8')

      // If the json is an array, then the cookie is generate by bot version
      // <= 1.2
      const json: IWebDriverOptionsCookie[] | ShopeeCredential = JSON.parse(cookiesStr)
      let cookies: IWebDriverOptionsCookie[]
      if (Array.isArray(json)) {
        // old version bot (<= 1.2)
        logger.warn('The cookies are saved by old version shopee coins bot.')
        cookies = json
      }
      else {
        if (!ignorePassword) {
          // If username or password is not explicitly set, loads if from credential
          this.username ||= json.username
          this.password ||= json.password
        }
        cookies = json.cookies
      }

      const options = this.driver.manage()
      await Promise.all(cookies.map((cookie) => options.addCookie(cookie)))
      logger.info('Cookies loaded.')
    } catch (e: unknown) {
      // Cannot load cookies; ignore. This may be due to invalid cookie string
      // pattern.
      if (e instanceof Error) {
        logger.error('Failed to load cookies: ' + e.message)
      }
      else {
        logger.error('Failed to load cookies.')
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
      .addArguments('--lang=zh-TW')
    if (process.env['DEBUG']) {
      logger.debug('Open debug port on 9222.')
      options.addArguments('--remote-debugging-port=9222')
    }

    this.driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build()
  }

  private async runBot(disableSmsLogin: boolean, ignorePassword: boolean): Promise<number> {
    if (this.pathCookie !== undefined) {
      await this.loadCookies(ignorePassword)
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
      await this.saveCookies(ignorePassword) // never raise error
    }

    // Receive coins.
    return await this.tryReceiveCoin()
  }

  private async takeScreenshot(screenshotPath: string): Promise<void> {
    const png = await this.driver.takeScreenshot()
    const filename = path.resolve(screenshotPath, 'screenshot.png')
    try {
      await fs.writeFile(filename, png, 'base64')
      logger.error(`A screenshot has been put at ${filename}.`)
    } catch (e: unknown) {
      if (e instanceof Error) {
        logger.error('Failed to save screenshot: ' + e.message)
      }
      else {
        logger.error('Failed to save screenshot.')
      }
    }
  }

  async run(disableSmsLogin: boolean, ignorePassword: boolean, screenshotPath: string | undefined): Promise<number> {
    await this.initDriver()

    try {
      const exitCode = await this.runBot(disableSmsLogin, ignorePassword)
      if (exitCode !== 0 && screenshotPath) {
        // If not succeeded then take a screenshot
        await this.takeScreenshot(screenshotPath)
      }
      return exitCode
    }
    catch (e: unknown) {
      if (screenshotPath) {
        // If not succeeded then take a screenshot
        await this.takeScreenshot(screenshotPath)
      }

      if (e instanceof error.TimeoutError) {
        logger.error('Operation timeout exceeded.')
        return EXIT_CODE_OPERATION_TIMEOUT_EXCEEDED
      }

      // Unknown error. Take a screenshot to debug.
      if (screenshotPath) {
        await this.takeScreenshot(screenshotPath)
      }
      throw e
    }
    finally {
      await this.driver.close()
    }
  }
}
