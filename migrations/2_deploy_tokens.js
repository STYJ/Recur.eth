// jshint esversion: 8
const MockToken = artifacts.require('../kyber-mock-contracts/MockToken.sol');

module.exports = async (deployer) => {
  // Deploy the tokens
  await deployer.deploy(MockToken, "KyberNetworkCrystal", "KNC", "18", (21 * 10**6 * 10**8).toString());

};


// var OrderManagerLogic = artifacts.require("./OrderManagerLogic.sol");
//
// module.exports = function(deployer, network, accounts) {
//   deployer.deploy(OrderManagerLogic, "0x818E6FECD516Ecc3849DAf6845e3EC868087B755", "0x818E6FECD516Ecc3849DAf6845e3EC868087B755");
// };
