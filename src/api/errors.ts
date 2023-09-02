import { CustomError } from 'ts-custom-error'

export class InvalidCookieError extends CustomError {}

export class UserNotLoggedInError extends CustomError {
  constructor() {
    super('User is not logged in.')
  }
}

export class ShopeeError extends CustomError {
  constructor(
    public readonly code: number,
    msg: string
  ) {
    super(msg)
  }
}
