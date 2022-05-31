# Shopee Coins Check-in

Check-in to Shopee and get coins automatically 😀😀

> **Warning**
> This bot is only tested for Taiwan users, who uses [shopee.tw](https://shopee.tw/).

The bot tries to login to user's Shopee account in the following order. If the previous one fails, the bot tries the next one until success.

1. saved cookies if given
2. username and password if both given

If `--cookie` is set, the bot tries to login using cookies. Cookies are then updated if login succeeded.

## Usage

Login with username and password and save the cookies for the first time.

```sh
docker run -it -v /path/to/somewhere:/cookie hyperbola/shopee-coins-bot:v1 -u username -p password -c /cookie
```

> **Warning**
> If this is your first login, you may need to authenticate by clicking the link in SMS message.

Login with cookies only.

```sh
docker run -it -v /path/to/somewhere:/cookie hyperbola/shopee-coins-bot:v1 -c /cookie
```

Help message.

```sh
docker run -it hyperbola/shopee-coins-bot:v1 --help
```

Exit code:

| Exit code | Description |
| --------- | ----------- |
| 0         | Success.    |
| 1         | User has already received coins today. Returns 0 if `--force` is set. |
| 2         | SMS authentication is needed but user refuses with `--no-sms`. |
| 3         | Shopee requires the bot to solve a puzzle, but the bot is too stupid to play it. This occurs if the user login fails too may times. |
| 4         | Operation timeout exceeded. |
| 69        | Shopee rejects the login because of too much tries. |
| 87        | Wrong password. |

### Options

Each option is optional.

- `-u`, `--user`: shopee username
- `-p`, `--pass`: shopee password
- `-P`, `--path-to-pass`: shopee password file
- `-c`, `--cookie`: cookie file
- `-x`, `--no-sms`: do not login with SMS; default to `false`
- `-f`, `--force`: no error if coins already received; default to `false`

Shopee username is determined in the following order. The first meet is the final result.

1. environment var `USERNAME`
2. argument `--user`

Shopee password is determined in the following order. The first meet is the final result.

1. environment var `PASSWORD`
2. argument `--pass`
3. argument `--path-to-pass`
