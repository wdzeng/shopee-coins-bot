FROM alpine:3.16.1 AS kelly-base
# LABEL org.opencontainers.image.title            # set by CI
LABEL org.opencontainers.image.description="Get Shopee coins everyday"
# LABEL org.opencontainers.image.version          # set by CI
# LABEL org.opencontainers.image.authors          # set by CI
# LABEL org.opencontainers.image.url              # set by CI
# LABEL org.opencontainers.image.source           # set by CI
# LABEL org.opencontainers.image.created          # set by CI
# LABEL org.opencontainers.image.documentation    # set by CI
# LABEL org.opencontainers.image.revision         # set by CI
LABEL org.opencontainers.image.licenses="MIT"


# Install required packages and add a non-root user
USER root
RUN apk add --no-cache chromium chromium-chromedriver nodejs tini \
    && adduser -u 1000 -H -D bot
ENV IMAGE_VARIANT=kelly
ENV TZ=Asia/Taipei
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/


# The regular image that contains CJK font
FROM kelly-base AS base
USER root
RUN apk add --no-cache font-noto-cjk
ENV IMAGE_VARIANT=regular


FROM kelly-base as kelly
USER bot
COPY dist /app
WORKDIR /app
ENTRYPOINT [ "tini", "--", "node", "index.js" ]


FROM base
USER bot
COPY dist /app
WORKDIR /app
ENTRYPOINT [ "tini", "--", "node", "index.js" ]
