// jshint esversion: 8
const HDWalletProvider = require('truffle-hdwallet-provider');
const path = require("path");

require('dotenv').config();
process.on('unhandledRejection', console.error.bind(console));

const project_id = process.env.INFURA_PROJECT_ID;
const mnemonic = process.env.MNEMONIC;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  // https://ethereum.stackexchange.com/questions/17051/how-to-select-a-network-id-or-is-there-a-list-of-network-ids
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),

  networks: {
    develop: {
      provider: new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10),
      // host: '127.0.0.1',
      // port: 8545,
      network_id: '*',
      // gas: 6721975,
      // gasPrice: 20000000000,
      // confirmations: 0,
      // timeoutBlocks: 50,
      // skipDryRun: true,
    },
    // coverage: {
    //   host: 'localhost',
    //   network_id: '*',
    //   port: 8555,
    //   gas: 99999999,
    //   gasPrice: 10
    // },
    // kovan: {
    //   provider: new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10),
    //   host: '127.0.0.1',
    //   port: 8545,
    //   network_id: 42,
    //   gas: 7000000,
    //   gasPrice: 20000000000,
    //   confirmations: 0,
    //   timeoutBlocks: 500,
    //   skipDryRun: true,
    // },
    // rinkeby: {
    //   provider: new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10),
    //   host: '127.0.0.1',
    //   port: 8545,
    //   network_id: 4,
    //   gas: 6900000,
    //   gasPrice: 25000000000,
    //   confirmations: 1,
    //   timeoutBlocks: 500,
    //   skipDryRun: true,
    // },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/${project_id}`, 0, 10),
      network_id: 3,
      // gas: 7000000,
      // gasPrice: 20000000000,
      // confirmations: 0,
      // timeoutBlocks: 500,
      // skipDryRun: false,
    },
    // mainnet: {
    //   provider: new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10),
    //   host: '127.0.0.1',
    //   port: 8545,
    //   network_id: 1,
    //   gas: 7000000,
    //   gasPrice: 20000000000,
    //   confirmations: 0,
    //   timeoutBlocks: 500,
    //   skipDryRun: false,
    // },
  },
  compilers: {
    solc: {
      version: '0.5.10',
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: 'petersburg',
  },
};
