/* global artifacts */
/* eslint-disable */

var OrderManagerLogic = artifacts.require("OrderManagerLogic");
var TestTokenOne = artifacts.require("TestTokenOne")
var TestTokenTwo = artifacts.require("TestTokenTwo")

module.exports = function(deployer, network, accounts) {
    deployer.deploy(OrderManagerLogic, "0x818E6FECD516Ecc3849DAf6845e3EC868087B755", accounts[0]);
    deployer.deploy(TestTokenOne, "TestTokenOne", "TT1", 6);
    deployer.deploy(TestTokenTwo, "TestTokenTwo", "TT2", 12);
};
