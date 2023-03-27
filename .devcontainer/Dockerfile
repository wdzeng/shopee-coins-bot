FROM mcr.microsoft.com/devcontainers/typescript-node:0-18

RUN apt-get update -y \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends unzip

ARG CHROME_VERSION="98.0.4758.102"
# Install google chrome
RUN wget -qO /tmp/chrome.deb https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}-1_amd64.deb \
    && apt-get install -yqq /tmp/chrome.deb \
    && rm /tmp/chrome.deb

# Install chromedriver
RUN wget -qO /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/${CHROME_VERSION}/chromedriver_linux64.zip \
    && unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/ \
    && rm /tmp/chromedriver.zip
# Set display port to avoid crash
ENV DISPLAY=:99
ENV PATH /usr/local/bin:$PATH

# Install required font
RUN apt-get update -y \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fonts-noto-cjk
