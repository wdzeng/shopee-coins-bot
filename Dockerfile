FROM selenium/node-chrome:latest

# Install node
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - \
    && sudo apt-get install -y nodejs \
    && sudo rm -rf /var/lib/apt/lists/*

COPY dist /app

WORKDIR /app
ENTRYPOINT [ "node", "index.js" ]
LABEL description="Get shopee coins everyday."
