FROM zenika/alpine-chrome:99

# Install chrome driver
USER root
RUN apk add --no-cache chromium-chromedriver

# Install node
USER root
RUN apk add --no-cache nodejs tini

# Source
COPY dist /app

USER chrome
WORKDIR /app
ENTRYPOINT [ "tini", "--", "node", "index.js" ]

LABEL description="Get shopee coins everyday."
