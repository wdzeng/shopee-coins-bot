# 蝦皮簽到機器人

[![release](https://badgen.net/github/release/wdzeng/shopee-coins-bot/stable?color=red)](https://github.com/wdzeng/shopee-coins-bot/releases/latest)
[![unittests](https://img.shields.io/github/actions/workflow/status/wdzeng/shopee-coins-bot/unittests.yml?branch=main&label=unittests)](https://github.com/wdzeng/shopee-coins-bot/actions/workflows/unittests.yml)
[![docker](https://badgen.net/badge/icon/docker?icon=docker&label=)](https://hub.docker.com/repository/docker/hyperbola/shopee-coins-bot)
[![ghcr](https://badgen.net/badge/icon/ghcr/black?icon=github&label=)](https://github.com/wdzeng/shopee-coins-bot/pkgs/container/shopee-coins-bot)

> [!NOTE]  
> 這是剛釋出的 v2 蝦皮簽到機器人。舊版的 v1 文件在[這裡](https://github.com/wdzeng/shopee-coins-bot/tree/archives/v1)，已不再維護。

> [!NOTE]  
> 如果你使用機器人遇到任何問題，歡迎到 [Issues](https://github.com/wdzeng/shopee-coins-bot/issues)
> 回報！

💰💰 簽到蝦皮領蝦幣 💰💰

這支程式針對台灣的蝦皮用戶設計，也就是 [shopee.tw](https://shopee.tw/)
網站的使用者。其他國家沒試過。

## 使用方式

這支程式需要用到 [docker](https://www.docker.com/) 或 [podman](https://podman.io/)。

機器人已經包成容器，映像位於 Docker Hub
[`hyperbola/shopee-coins-bot`](https://hub.docker.com/repository/docker/hyperbola/shopee-coins-bot)
以及 GitHub Container Registry
[`ghcr.io/wdzeng/shopee-coins-bot`](https://github.com/wdzeng/shopee-coins-bot/pkgs/container/shopee-coins-bot)。
支援 amd64、arm64（樹梅派 4）以及 armv7。

### Tags

以下為映像最新的 tag。其他可用的 tag 請參考 Docker Hub 或 GitHub Container Registry 頁面。

- `edge`

## 使用說明

傳入 `--help` 可以印出使用說明。

```sh
docker run hyperbola/shopee-coins-bot:edge --help
```

機器人支援四個指令。

- `whoami`: 顯示你的蝦皮帳號。這通常是用來測試 cookie 是否可用。
- `checkin`: 進行簽到。
- `balance`: 顯示你的蝦幣餘額。
- `history`: 顯示你七天內的簽到記錄。

### 通用參數

這些參數適用於所有指令。

- `-c`, `--cookie <FILE>`: cookie 檔案；所有指令必填
- `-q`, `--quiet`: 不要印出提示訊息（仍會印出警告與錯誤訊息）；所有指令選填

### 通用 Exit Code

| Exit Code | 說明                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `0`       | 指令成功                                                                                                      |
| `2`       | Cookie 無效；這通常是人工錯誤，像是複製貼上 cookie 時多貼或少貼了一些東西。                                   |
| `3`       | 登入失敗；這通常是自然錯誤，像是 cookie 過期。                                                                |
| `87`      | 參數不合法。                                                                                                  |
| `255`     | 未知錯誤。有可能是 Bug；如果無法排解，請至 [Issues](https://github.com/wdzeng/shopee-coins-bot/issues) 回報。 |

## 準備 Cookie 檔案

所有的指令都需要 cookie 才能執行。請參考[這份](./docs/how-to-get-cookie.md)說明，將 cookie
複製貼上到一個檔案。

> [!IMPORTANT]  
> Cookie 是敏感資料，請妥善保存。

然後你可以用 `-c` 或 `--cookie` 將 cookie 檔案餵給機器人，再用 `whoami`
指令確認是否登入成功。如果成功，以下指令會印出你的帳號。

```sh
# 假設 cookie 檔案在 ~/.config/shopee/cookie
docker run -v "$HOME/.config/shopee:/config" hyperbola/shopee-coins-bot:edge -c /config/cookie whoami
```

為了讀取 cookie，所有的指令都會需要搭配 `-v <MOUNT_POINT>` 和
`-c <FILE>`。為求精簡，以下所有範例中的指令將不列出 `-v` 和 `-c`。

## 簽到

使用 `checkin` 指令進行簽到。

```shell
docker run hyperbola/shopee-coins-bot:edge checkin
```

### 簽到參數

- `-f`, `--force`: 如果今天已經簽到過，不要回報錯誤。

**Exit Code：**

| Exit Code | 說明                                             |
| --------- | ------------------------------------------------ |
| `0`       | 簽到成功。                                       |
| `1`       | 今日已簽到過；如果傳了 `--force`，就會改為 `0`。 |

## 餘額

使用 `balance` 指令顯示蝦幣餘額。以下範例顯示你有 87 個蝦幣。

```shell
$ docker run hyperbola/shopee-coins-bot:edge balance
87
```

## 簽到記錄

使用 `history` 指令顯示蝦幣餘額。以下範例顯示你已經連續簽到三天，且今天已經簽到。

```shell
$ docker run hyperbola/shopee-coins-bot:edge history
✅ 0.05
✅ 0.10
✅ 0.15 <
⬜ 0.20
⬜ 0.25
⬜ 0.25
⬜ 0.50
```

如果你想分析 output，可以用 `--output json`，這樣印出的結果比較好分析。

```sh
$ docker run hyperbola/shopee-coins-bot:edge history --output json
{"amounts":[0.05,0.1,0.15,0.2,0.25,0.25,0.5],"checkedInToday":true,"todayIndex":2}
```

### 簽到記錄參數

- `-o`, `--output`: Output 的格式，必須是 `raw` 或 `json` 其中之一。選填；預設為 `raw`。

### 簽到記錄 Output

如果 `--output` 是 `raw`，會印出人眼可讀的結果。

如果 `--output` 是 `json`，其結果格式如下。

- `.amounts` (`number[]`): 含有七個數字的陣列，分別表示七天來每天可領的蝦幣數量。
- `.checkedInToday` (`boolean`): 今天是否已經簽到。
- `.todayIndex` (`number`): 今天是七天中的第幾天；此值為 0-based，亦即 `0` 表第一天、`1`
  表第二天、依此類推。

## 姊妹機器人

- [Pinkoi 簽到機器人](https://github.com/wdzeng/pinkoi-coins-bot/)
- [批踢踢登入機器人](https://github.com/wdzeng/ptt-login-bot/)
- [Telegram ID 覬覦者](https://github.com/wdzeng/telegram-id-pretender/)
