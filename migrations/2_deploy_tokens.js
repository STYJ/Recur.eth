/* global artifacts */
/* eslint-disable */
const BN = require('bn.js');

const KNC = artifacts.require('../kyber-mock-contracts/KyberNetworkCrystal.sol');
const MANA = artifacts.require('../kyber-mock-contracts/Mana.sol');

module.exports = async (deployer) => {
  // Deploy the tokens
  await deployer.deploy(
    KNC,
    "KyberNetworkCrystal",
    "KNC",
    "18",
    new BN(21).mul(new BN(10).pow(new BN(24))) // 21 * 10 ** 6 * 10 ** 18
  );
  await deployer.deploy(
    MANA,
    "Mana",
    "Mana",
    "18",
    new BN(21).mul(new BN(10).pow(new BN(24)))
  );
};
