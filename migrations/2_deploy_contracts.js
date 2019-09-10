/* global artifacts */
/* eslint-disable */
const BN = require('bn.js');

var OrderManagerLogic = artifacts.require("OrderManagerLogic.sol");
var Token = artifacts.require("Token.sol")

module.exports = function(deployer, network, accounts) {
    deployer.deploy(OrderManagerLogic, "0x818E6FECD516Ecc3849DAf6845e3EC868087B755", accounts[0]);
    deployer.deploy(Token, "TestToken", "TT", 18, new BN(21).mul(new BN(10).pow(new BN(24))));
};
