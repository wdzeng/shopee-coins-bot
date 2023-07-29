import { CustomError } from 'ts-custom-error'

export class InvalidCookieError extends CustomError {}

export class UserNotLoggedInError extends CustomError {
  constructor() {
    super('User is not logged in.')
  }
}

// TODO: Use ShopeeError if status code is 2XX but response body contains error messages.
export class ShopeeError extends CustomError {
  constructor(
    public readonly code: number,
    msg: string
  ) {
    super(msg)
  }
}
