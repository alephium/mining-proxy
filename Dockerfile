FROM golang as builder
RUN go install github.com/Sqooba/reconf@v0.0.0-20211206123542-0f08bd5e38e7

FROM node:16-alpine

COPY --from=builder /go/bin/reconf /reconf

COPY . /src
WORKDIR /src

run apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python3 && \
  npm install --quiet node-gyp -g &&\
  npm install --quiet && \
  apk del native-deps

ENV LOG_PATH=./logs/
ENV DIFF1_TARGET_NUM_ZERO=30
ENV SERVER_HOST=127.0.0.1
ENV SERVER_PORT=20032
ENV PROXY_PORT=30032
ENV ADDRESSES=[]
ENV ADDRESS=""

ENTRYPOINT ["/reconf", "-f", "-w", "/src/config.json.template:/src/config.json", "npm", "run", "start"]
