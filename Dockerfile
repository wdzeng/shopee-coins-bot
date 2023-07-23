FROM docker.io/node:20.5.0-alpine3.17

COPY dist/index.cjs /app/index.js
RUN apk add --no-cache tini

ENV TZ=Asia/Taipei
WORKDIR /app
ENTRYPOINT [ "/sbin/tini", "--", "node", "index.js" ]
