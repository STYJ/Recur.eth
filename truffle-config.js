// jshint esversion: 8
/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() {
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>')
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 * Also, truffle-hdwallet-provider messes up nonce in try / catch https://github.com/trufflesuite/truffle/issues/2016
 */

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
      // provider: function() {
      //   return new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10);
      // },
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
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
      version: '^0.5.0',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: 'petersburg',
      },
    },
  },
};
