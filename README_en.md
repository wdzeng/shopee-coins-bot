# Shopee Coins Bot

[中文](README.md) 👈

Checkin to Shopee and get coins by CLI 😀😀

> **Warning**
>
> This bot is only tested for customers in Taiwan who use [shopee.tw](https://shopee.tw/).

The bot tries to login to user's Shopee account in the following order.

1. saved cookies if exist or given
2. username and password if both given

If argument `--cookie` is set, the bot tries to login with cookies. Cookies are then updated every time a login completes.

## Usage

Login with username and password for the first time and save cookies for future use.

```sh
docker run -it -v /path/to/somewhere:/cookie \
    hyperbola/shopee-coins-bot:v1 -u username -p password -c /cookie
```

> **Warning**
> 
> You may need to authenticate by clicking the link in SMS message when logging with username and password. The bot will wait for you during the process. Please complete this action in 10 minutes.

Login with cookies only.

```sh
docker run -it -v /path/to/somewhere:/cookie hyperbola/shopee-coins-bot:v1 -c /cookie
```

See help message.

```sh
docker run -it hyperbola/shopee-coins-bot:v1 --help
```

### Options

Each option is optional.

- `-u`, `--user`: shopee username; this should be mobile number, email or shopee ID
- `-p`, `--pass`: shopee password; this is not safe
- `-P`, `--path-to-pass`: shopee password file
- `-c`, `--cookie`: cookie file
- `-x`, `--no-sms`: do not login with SMS; default to `false`
- `-f`, `--force`: no error if coins already received; default to `false`

Shopee username is determined in the following order. The first meet is the final result.

1. environment variable `USERNAME`
2. argument `--user`

Shopee password is determined in the following order. The first meet is the final result.

1. environment variable `PASSWORD`
2. argument `--pass` (not safe)
3. argument `--path-to-pass`

### Exit Code

| Exit code | Description |
| --------- | ----------- |
| 0         | Success.    |
| 1         | User has already received coins today. Returns 0 if `--force` is set. |
| 2         | SMS authentication is needed but user refuses with `--no-sms`. |
| 3         | Shopee requires the bot to solve a puzzle, but the bot is too stupid to play it. This occurs if the user login fails too may times. |
| 4         | Operation timeout exceeded. |
| 69        | Shopee rejects the login because of too much tries. |
| 87        | Wrong username or password. |
