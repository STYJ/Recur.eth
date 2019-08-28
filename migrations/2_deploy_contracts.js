/* global artifacts */
/* eslint-disable */
var OrderManagerLogic = artifacts.require("./OrderManagerLogic.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(OrderManagerLogic, "0x818E6FECD516Ecc3849DAf6845e3EC868087B755", accounts[0]);
};
