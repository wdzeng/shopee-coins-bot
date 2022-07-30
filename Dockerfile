ARG BASE_IMAGE


FROM alpine:3.16.1 AS alpine-base
RUN apk add --no-cache chromium chromium-chromedriver nodejs tini \
    && adduser -u 1000 -H -D bot
ENV CHROME_BIN=/usr/bin/chromium-browser CHROME_PATH=/usr/lib/chromium/


FROM alpine-base AS alpine-font
RUN apk add --no-cache font-noto-cjk


FROM --platform=$BUILDPLATFORM debian:11.4-slim AS debian-base
ARG BUILDARCH BUILDVARIANT
# use the same node version as alpine
ARG NODE_VERSION=v16.16.0
RUN if [ "$BUILDARCH" = 'amd64' ]; then \
      NODE_ARCH=linux-x64; \
    elif [ "$BUILDARCH" = 'arm64' ]; then \
      NODE_ARCH=linux-arm64; \
    elif [ "$BUILDARCH" = 'arm' -a "$BUILDVARIANT" == 'v7' ]; then \
      NODE_ARCH=linux-armv7l; \
    else \
      echo 'Your plarform is not supported.' >&2 && exit 1; \
    fi \
    && apt-get update -y \
    && apt-get install -y curl \
    && curl -sSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${NODE_ARCH}.tar.gz" | tar xzvf - -C /usr/local --strip-components=1 \
    && apt-get install --no-install-recommends -y chromium chromium-driver tini \
    && apt-get remove --auto-remove -y curl \
    && rm -rf /var/lib/apt/lists/* \
    && adduser bot --uid 1000 --no-create-home --disabled-password --gecos ''
ENV CHROME_BIN=/usr/bin/chromium CHROME_PATH=/usr/lib/chromium/


FROM --platform=$BUILDPLATFORM debian-base AS debian-font
RUN apt-get update -y \
    && apt-get install --no-install-recommends -y fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*


FROM ${BASE_IMAGE}
ARG VARIANT
USER bot
COPY dist /app
ENV TZ=Asia/Taipei
ENV IMAGE_VARIANT=${VARIANT}
WORKDIR /app
ENTRYPOINT [ "tini", "--", "node", "index.js" ]
