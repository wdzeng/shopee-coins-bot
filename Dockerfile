FROM zenika/alpine-chrome:99 as slim

LABEL maintainer="Hyperbola <me@hyperbola.me>"
LABEL org.label-schema.name="Shopee Coins Bot"
LABEL org.label-schema.description="Get shopee coins everyday."
LABEL org.label-schema.url="https://github.com/wdzeng/shopee-coins-bot"

USER root
RUN apk add --no-cache chromium-chromedriver nodejs tini
COPY dist /app

USER chrome
ENV TZ="Asia/Taipei"
WORKDIR /app
ENTRYPOINT [ "tini", "--", "node", "index.js" ]
