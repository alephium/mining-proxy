## Run

1. install node.js(>=14) and npm(>=8)
2. set your addresses in `config.json`

configs explanation:

```json
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

