# cw-livepeer
This repo encapsulates a livepeer multi merkle miner that runs with minimal setup. It uses mongodb as a database to keep track of generated addresses allowing you to startup immediately where your multi merkle miner left off. The merkle tree construction requires a lot of memory and as such requires powerful hardware to run.

## Dependencies
A device with 4 GB of RAM

MongoDB

## Setup
`npm i` or `yarn` to install all npm dependencies

`npm i truffle -g` to install truffle globally

`truffle install zeppelin` to install contract dependencies

`mongodb` to start MongoDB.

`.env` configuration file with the following template

Make sure that your key is stored in the same exact format that the `go-livepeer` client would create, in the same location `full/path/to/.lpData/keystore`. The code will look in `~/.lpData` and resolve where the key is as long as it is named and formatted as an encrypted JSON blob with the filename as the UTC creation time and associated address. 
```
MONGO_CONNECTION_URL=mongodb://127.0.0.1:27017/
DATABASE_NAME=livepeer
STATE_COLLECTION=state

ETHEREUM_NETWORK=mainnet
ETHEREUM_ADDRESS=0xPUT_YOUR_ADDRESS
ETHEREUM_ADDRESS_PASSWORD=
KEYSTORE_DATA_DIR=full/path/to/.lpData

MAX_GAS_PRICE=3210000099
MIN_GAS_PRICE=1490000099
```

`MONGO_CONNECTION_URL`      - Connection url of mongodb instance

`DATABASE_NAME`             - Arbitrary database name for storage

`STATE_COLLECTION`          - Arbitrary collection name for storage

`ETHEREUM_NETWORK`          - Network to run multi merkle miner (`mainnet` or `rinkeby`)

`ETHEREUM_ADDRESS`          - Hex format of Ethereum address/account

`ETHEREUM_ADDRESS_PASSWORD` - Password to unlock Ethereum address/account

`KEYSTORE_DATA_DIR`         - Path to keystore parent directory

`MAX_GAS_PRICE`             - Maximum Ethereum gas price for transactions

`MIN_GAS_PRICE`             - Minimum Ethereum gas price for transactions

## Usage
`yarn start:mine` to run main application.

## Thanks to
`https://github.com/jsynowiec/node-flowtype-boilerplate` for the boilerplate of this repo.
