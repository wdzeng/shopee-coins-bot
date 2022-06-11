# Shopee Coins Bot

[![release](https://badgen.net/github/release/wdzeng/shopee-coins-bot/stable?color=red)](https://github.com/wdzeng/shopee-coins-bot/releases/latest)
[![github](https://badgen.net/badge/icon/github/black?icon=github&label=)](https://github.com/wdzeng/shopee-coins-bot)
[![docker](https://badgen.net/badge/icon/docker?icon=docker&label=)](https://hub.docker.com/repository/docker/hyperbola/shopee-coins-bot)

[中文](README.md) 👈

Checkin to Shopee and get coins by CLI 😀😀

> **Warning**
>
> This bot is only tested for customers in Taiwan who use [shopee.tw](https://shopee.tw/).

## Usage

### Print Help Message

```sh
docker run -it hyperbola/shopee-coins-bot:v1 --help
```

### Login with Username and Password

You may set a location for the bot to save cookies.

```sh
docker run [-it] \
    -e USERNAME=<username> \
    -e PASSWORD=<password> \
    -v /path/to/save/cookies:/cookies \
    hyperbola/shopee-coins-bot:v1 -c /cookies
```

> **Warning**
> You may need to authenticate by clicking the link in SMS message when the bot is logging in with username and password. Please complete this action in 10 minutes.

### Automatic Login

If you have cookies saved in the previous run, you can login without username or password.

```sh
docker run [-it] \
    -v /path/to/cookies:/cookies \
    hyperbola/shopee-coins-bot:v1 -c /cookies
```

### Options

Each argument is optional.

- `-u`, `--user`: shopee username; this should be mobile number, email or shopee ID
- `-p`, `--pass`: shopee password
- `-P`, `--path-to-pass`: shopee password file
- `-c`, `--cookie`: cookie file
- `-x`, `--no-sms`: do not login with SMS; default to `false`
- `-f`, `--force`: no error if coins already received; default to `false`

If both cookies and username/password are given, the bot tries to login to in the following order.

1. cookies
2. username and password

Once there is a successful login, the bot refreshes cookies.

> **Warning**
>
> Cookies are confidential credentials. Do not share them with others.

Shopee username is determined in the following order.

1. environment variable `USERNAME`
2. argument `--user`

Shopee password is determined in the following order.

1. environment variable `PASSWORD`
2. argument `--pass`
3. argument `--path-to-pass`

## Exit Code

| Exit code | Description |
| --------- | ----------- |
| 0         | Success.    |
| 1         | User has already received coins today. Returns 0 if `--force` is set. |
| 2         | SMS authentication is needed but user refuses with `--no-sms`. |
| 3         | Shopee requires the bot to solve a puzzle, but the bot is too stupid to play it. This occurs if the user login fails too may times. |
| 4         | Operation timeout exceeded. |
| 69        | Shopee rejects the login because of too much tries. |
| 87        | Wrong username or password. |
