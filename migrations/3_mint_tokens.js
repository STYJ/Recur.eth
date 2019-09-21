/* global artifacts, web3 */
/* eslint-disable no-unused-vars */
const BN = require("bn.js");
const fs = require('fs');

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const OrderManagerLogic = artifacts.require("OrderManagerLogic");
const TokenConfig = JSON.parse(fs.readFileSync('../config/tokens.json', 'utf8'));

function tx(result, call) {
  const logs =
    result.logs.length > 0 ? result.logs[0] : { address: null, event: null };

  console.log();
  console.log(`   Calling ${call}`);
  console.log("   ------------------------");
  console.log(`   > transaction hash: ${result.tx}`);
  console.log(`   > contract address: ${logs.address}`);
  console.log(`   > gas used: ${result.receipt.gasUsed}`);
  console.log(`   > event: ${logs.event}`);
  console.log();
}

function txEth(result, call) {
  console.log();
  console.log(`   Calling ${call}`);
  console.log("   ------------------------");
  console.log(`   > transaction hash: ${result.transactionHash}`);
  console.log(`   > contract address: ${result.to ? result.to : result.contractAddress}`);
  console.log(`   > gas used: ${result.gasUsed}`);
  console.log();
}

module.exports = async (deployer, network, accounts) => {
  const Admin = accounts[0];
  const UserA = accounts[1];
  const UserB = accounts[2];
  const UserC = accounts[3];

  // Get deployed instance
  const TokenOneInstance = await TestTokenOne.at(TestTokenOne.address);
  const TokenTwoInstance = await TestTokenTwo.at(TestTokenTwo.address);
  const OML = await OrderManagerLogic.at(OrderManagerLogic.address);

  // Mint tokens
  tx(
    await TokenOneInstance.mint(
      Admin,
      new BN(TokenConfig.Admin.TokenOne).mul(new BN(10).pow(new BN(6)))            
    ),
    `Mint ${TokenConfig.Admin.TokenOne} TestTokenOne to Admin`
  );
  tx(
    await TokenOneInstance.mint(
      UserA,
      new BN(TokenConfig.UserA.TokenOne).mul(new BN(10).pow(new BN(6)))      
    ),
    `Mint ${TokenConfig.UserA.TokenOne} TestTokenOne to UserA`
  );
  tx(
    await TokenOneInstance.mint(
      OML.address,
      new BN(TokenConfig.OML.TokenOne).mul(new BN(10).pow(new BN(6)))      
    ),
    `Mint ${TokenConfig.OML.TokenOne} TestTokenOne to OML`
  );
  tx(
    await TokenTwoInstance.mint(
      Admin,
      new BN(TokenConfig.Admin.TokenTwo).mul(new BN(10).pow(new BN(12)))      
    ),
    `Mint ${TokenConfig.Admin.TokenTwo} TestTokenTwo to Admin`
  );
  tx(
    await TokenTwoInstance.mint(
      UserB,
      new BN(TokenConfig.UserB.TokenTwo).mul(new BN(10).pow(new BN(12)))
    ),
    `Mint ${TokenConfig.UserB.TokenTwo} TestTokenTwo to UserB`
  );
  tx(
    await TokenTwoInstance.mint(
      OML.address,
      new BN(TokenConfig.OML.TokenTwo).mul(new BN(10).pow(new BN(12)))      
    ),
    `Mint ${TokenConfig.OML.TokenTwo} TestTokenTwo to OML`
  );

  // Transfer ETH to OML
  txEth(
    await web3.eth.sendTransaction({
      from: UserC,
      value: web3.utils.toWei(new BN(10).pow(new BN(7)), "Ether")
    }),
    "Sending 10,000,000 ETH to OML from UserC"
  );
};
