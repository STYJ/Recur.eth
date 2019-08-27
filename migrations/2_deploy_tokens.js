/* global artifacts */
/* eslint-disable */
const KNC = artifacts.require('../kyber-mock-contracts/KyberNetworkCrystal.sol');
const ZIL = artifacts.require('../kyber-mock-contracts/Zilliqa.sol');

module.exports = async (deployer) => {
  // Deploy the tokens
  await deployer.deploy(KNC, "KyberNetworkCrystal", "KNC", "18", (21 * 10**6 * 10**8).toString());
  await deployer.deploy(ZIL, "Zilliqa", "ZIL", "12", (21 * 10**6 * 10**8).toString());

};
