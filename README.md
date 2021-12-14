## Run

1. install node.js(>=14) and npm(>=8)
2. set your addresses in `config.json`

configs explanation:

```javascript
{
    "serverHost": "",       // mining pool server host
    "serverPort": 20032,    // mining pool server port
    "proxyPort": 30032,     // port which proxy bind
    "addresses": []         // your miner addresses(one address per group)
}
```

run miner-proxy:

```shell
npm install
npm run start
```

run miner:

```shell
gpu-miner -p 30032
```



# Docker and docker-compose setup

Mind configuring `SERVER_HOST` and `ADDRESSES` in the snippet below

```
version: "3.3"
services:
  miner:
    image: alephium/gpu-miner:latest
    command:
      - "-a"
      - "proxy"
    restart: always
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  proxy:
    image: alephium/mining-proxy:latest
    restart: unless-stopped
    ports:
      - 10973
    environment:
      - SERVER_HOST=1.2.3.4
      - PROXY_PORT=10973
      - ADDRESSES=["1A4...","12G...","1Hk...","179..."]
```
