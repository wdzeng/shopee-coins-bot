# Use Debian distribution
FROM node:16

ARG CHROME_VERSION="98.0.4758.102"
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends unzip \
    && wget -qO /tmp/chrome.deb https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}-1_amd64.deb \
    && wget -qO /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/${CHROME_VERSION}/chromedriver_linux64.zip \
    && unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/ \
    && apt-get install -y /tmp/chrome.deb \
    && rm /tmp/chrome.deb /tmp/chromedriver.zip \
    && rm -rf /var/lib/apt/lists/*

COPY ./dist /app

WORKDIR /app
ENTRYPOINT ["node", "index.js"]

LABEL description="Get shopee coins everyday."
