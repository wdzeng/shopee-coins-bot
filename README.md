# 蝦皮簽到機器人

[![release](https://badgen.net/github/release/wdzeng/shopee-coins-bot/stable?color=red)](https://github.com/wdzeng/shopee-coins-bot/releases/latest)
[![github](https://badgen.net/badge/icon/github/black?icon=github&label=)](https://github.com/wdzeng/shopee-coins-bot)
[![docker](https://badgen.net/badge/icon/docker?icon=docker&label=)](https://hub.docker.com/repository/docker/hyperbola/shopee-coins-bot)

💰💰 簽到蝦皮領蝦幣 💰💰

這支程式針對台灣的蝦皮用戶設計，也就是 [shopee.tw](https://shopee.tw/) 網站的使用者。其他國家沒試過。

## 使用方式

這支程式需要用到 [docker](https://www.docker.com/) 或 [podman](https://podman.io/)。

機器人已經包成容器，映像位於 Docker Hub [`hyperbola/shopee-coins-bot`](https://hub.docker.com/repository/docker/hyperbola/shopee-coins-bot) 以及 GitHub Container Registry [`ghcr.io/wdzeng/shopee-coins-bot`](https://github.com/wdzeng/shopee-coins-bot/pkgs/container/shopee-coins-bot)。支援的平台有 amd64 以及 arm64（含樹梅派 4），但 1.0.x 版本的映像僅支援 amd64。

### Tags

以下為映像最新的 tag。其他可用的 tag 請參考 Docker Hub 或 GitHub Container Registry 頁面。

- `latest`, `1`, `1.2`, `1.2.1`

### 使用說明

傳入 `--help` 可以印出使用說明。

```sh
docker run hyperbola/shopee-coins-bot:1 --help
```

### 帳號密碼登入

第一次使用時，需要提供蝦皮帳號密碼，並且強烈建議設定機器人登入後儲存 cookie 的位置，以備未來機器人能夠執行自動登入。如果你不指定一個 cookie 的位置，那未來每次登入都會需要帳號與密碼。

```sh
docker run -v /path/to/somewhere:/cookie \
    hyperbola/shopee-coins-bot:1 -u username -p password -c /cookie
```

> **Warning**
>
> 機器人進行登入期間，你可能會收到來自 shopee 的 Email 或手機驗證簡訊，其中會有一個驗證登入的連結。請在 10 分鐘內進行驗證，在這期間機器人會等你。一旦你點了驗證簡訊後，機器人會立即繼續執行下去。

### 自動登入

如果之前有儲存過 cookie，用 cookie 登入即可，這樣就不會觸發簡訊驗證。

```sh
docker run -v /path/to/somewhere:/cookie hyperbola/shopee-coins-bot:1 -c /cookie
```

## 參數

所有參數都是選填。

- `-u`, `--user <STRING>`: 蝦皮帳號；可以是手機、電子信箱或蝦皮 ID
- ~~`-p`, `--pass <STRING>`: 蝦皮密碼~~ **DEPRECATED**
- `-P`, `--path-to-pass <FILE>`: 密碼檔案
- `-c`, `--cookie <FILE>`: cookie 檔案
- ~~`-i`, `--ignore-password`: 不要儲存密碼~~ **DEPRECATED**
- `-x`, `--no-sms`: 如果觸發簡訊驗證，直接令程式以失敗結束；預設為 `false`
- `-y`, `--no-email`: 如果觸發電子郵件驗證，直接令程式以失敗結束；預設為 `false`
- `-f`, `--force`: 如果今天已經領過蝦幣，令程式以成功作收；預設為 `false`
- `-q`, `--quiet`: 不要印出訊息；但仍會印出警告與錯誤訊息
- `-s`, `--screenshot <DIR>`: 簽到失敗時將螢幕截圖的儲存於指定資料夾下（圖檔檔名為 screenshot.png）
- `-V`, `--version`: 印出版本
- `-h`, `--help`: 印出參數說明

如果你同時設定了帳號、密碼與 cookie，機器人會以下列順序嘗試登入：

1. cookie
2. 帳號與密碼

每次登入成功時，機器人就會將 cookie 更新至最新狀態。

> **Warning**
>
> Cookie 是機密資料，請妥善保存。

Cookie 檔案的位置以下列優先順序決定。

1. 環境變數 `COOKIE`
2. 程式參數 `--cookie`

帳號以下列優先順序決定。

1. 環境變數 `USERNAME`
2. 程式參數 `--user`

密碼以下列優先順序決定。

1. 環境變數 `PASSWORD`
2. ~~程式參數 `--pass`~~ **DEPRECATED**
3. 環境變數 `PATH_PASS`
4. 程式參數 `--path-to-pass`

## Exit Code

| Exit code | 解釋 |
| --------- | ----------- |
| 0         | 簽到成功。    |
| 1         | 今日已簽到。如果傳了 `--force` 參數，那就會改為回傳 0。 |
| 2         | 需要簡訊驗證，但你傳了 `--no-sms` 參數。 |
| 3         | 機器人遇到拼圖遊戲，但是它不會玩🥺🥺<br> 這通常是因為嘗試登入次數太多，被網站 ban 掉。 |
| 4         | 操作逾時。 |
| ~~5~~     | ~~觸發電子郵件驗證。機器人尚不支援。~~ **DEPRECATED** |
| 6         | 使用者進行簡訊驗證時選擇拒絕機器人登入。 |
| 7         | 需要電子郵件驗證，但你傳了 `--no-email` 參數。 |
| 69        | 嘗試登入次數太多被 ban。 |
| 77        | 參數不合法。 |
| 87        | 帳號或密碼錯誤。 |
| 88        | 不明錯誤。 |

## 姊妹機器人

- [Pinkoi 簽到機器人](https://github.com/wdzeng/pinkoi-coins-bot/)
- [批踢踢登入機器人](https://github.com/wdzeng/ptt-login-bot/)
- [Telegram ID 覬覦者](https://github.com/wdzeng/telegram-id-pretender/)
