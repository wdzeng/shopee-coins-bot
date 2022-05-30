import fs from 'fs/promises'
import {
  Builder, By, IWebDriverOptionsCookie, until, WebDriver, error
} from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import logger from 'loglevel'
import { xpathByText } from './util'

const urlLogin = 'https://shopee.tw/buyer/login?from=https%3A%2F%2Fshopee.tw%2Fuser%2Fcoin&next=https%3A%2F%2Fshopee.tw%2Fshopee-coins'
const urlCoin = 'https://shopee.tw/shopee-coins'
const txtWrongPassword = '你的帳號或密碼不正確，請稍後再試'
const txtPlayPuzzle = '點擊以重新載入頁面'
const txtUseLink = '使用連結驗證'
const txtReceiveCoin = '今日簽到獲得 '
const txtCoinAlreadyReceived = '明天再回來領取 '
const txtTooMuchTry = '哎呀! 您已達到今日驗證次數上限。'
const txtShopeeReward = '蝦幣獎勵'
const waitTimeout = 2 * 60 * 1000 // 2 minutes

// exit code:
// - 0: success
// - 1: already received
// - 5: need SMS authentication
// - 33: cannot solve the puzzle
// - 44: operation timeout exceeded
// - 87: missing or wrong username/password
// - 69: too much try
// - 255: unknown error occurred

type LoginResult = 0 | 5 | 33 | 44 | 87 | 69 | 255

export default class TaiwanShopeeBot {
  // @ts-ignore
  private driver: WebDriver

  constructor(
    private username: string | undefined,
    private password: string | undefined,
    private pathCookie: string | undefined
  ) { }

  private async tryLogin(): Promise<LoginResult> {
    logger.debug('Start to check if user is already logged in.')
    await this.driver.get(urlLogin)
    // Wait for redirecting (5s)
    await new Promise(res => setTimeout(res, 3*3600*1000))

    const curUrl = await this.driver.getCurrentUrl()
    logger.debug('Current at url: ' + curUrl)
    if (curUrl === urlCoin) {
      // Already logged in.
      logger.info('Already logged in.')
      return 0
    }

    // Not logged in; try to login by password.
    if (!this.username || !this.password) {
      logger.error('Failed to login. Missing username or password.')
      return 87
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
      logger.info('Login succeeded.')
      return 0
    }

    if (text === txtWrongPassword) {
      logger.error('Login failed: wrong password.')
      return 87
    }
    // if (text === txtTooMuchTry) {
    //   logger.error('Login failed: too much try.')
    //   return 69
    // }
    if (text === txtPlayPuzzle) {
      logger.debug('Login failed: I cannot solve the puzzle.')
      return 33
    }
    if (text === txtUseLink) {
      logger.debug('Login failed: please login via SMS.')
      return 5
    }

    // Unknown error
    logger.error('Login failed. Unexpected error occurred.')
    logger.debug(`Unexpected error occurred: ${text}`)
    return 255
  }

  private async tryReceiveCoin(): Promise<0 | 1> {
    const xpath = `${xpathByText('button', txtReceiveCoin)} | ${xpathByText('button', txtCoinAlreadyReceived)}`
    await this.driver.wait(until.elementLocated(By.xpath(xpath)), waitTimeout)
    const btnReceiveCoin = await this.driver.findElement(By.xpath(xpath))

    // Check if coin is already received today
    const text = await btnReceiveCoin.getText()
    if (text.startsWith(txtCoinAlreadyReceived)) {
      // Already received
      logger.info('You have already received coin today.')
      return 1
    }

    await btnReceiveCoin.click()
    // TODO: Wait until the click takes effect

    logger.info('Coin received.')
    return 0
  }

  private async tryLoginWithSmsLink(): Promise<void> {
    // Wait until the '使用連結驗證' is available.
    await this.driver.wait(until.elementLocated(By.xpath(xpathByText('div', txtUseLink))), waitTimeout)

    // Click the '使用連結驗證' button.
    const btnLoginWithLink = await this.driver.findElement(By.xpath(xpathByText('div', txtUseLink)))
    await btnLoginWithLink.click()

    // Check if reach daily limit.
    const text = By.xpath(xpathByText('div', txtTooMuchTry + 'sdfas'))
    console.log(text)

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
      logger.debug('Failed to load cookies.')
    }
  }

  private async initDriver(): Promise<void> {
    const options = new chrome.Options()
    options
      .addArguments('--headless')
      .addArguments('--start-maximized')
      .addArguments('--disable-infobars') // cspell:disable-line
      .addArguments('--disable-extensions')
      .addArguments('--no-sandbox')
      .addArguments('--disable-dev-shm-usage')
      .addArguments('--remote-debugging-port=9224')

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build()
  }

  async run(smsLogin: boolean): Promise<number> {
    await this.initDriver()

    try {
      if (this.pathCookie !== undefined) {
        await this.loadCookies()
      }
      else {
        logger.info('No cookies given. Will try to login using username and password.')
      }

      let result: number = await this.tryLogin()
      if (result === 5) {
        // Login failed. Try use the SMS link to login.
        if (smsLogin) {
          await this.tryLoginWithSmsLink()
          result = 0
        }
        else {
          logger.error('SMS authentication is required.')
          return result
        }
      }

      if (result !== 0) {
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
        return 44
      }
      // Unknown error.
      throw e
    }
    finally {
      await this.driver.close()
    }
  }
}
