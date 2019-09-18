/* global artifacts, web3 */
/* eslint-disable no-unused-vars */
const BN = require('bn.js');

const TestTokenOne = artifacts.require("TestTokenOne")
const TestTokenTwo = artifacts.require("TestTokenTwo")

function tx(result, call) {
  const logs = (result.logs.length > 0) ? result.logs[0] : { address: null, event: null };

  console.log();
  console.log(`   Calling ${call}`);
  console.log('   ------------------------');
  console.log(`   > transaction hash: ${result.tx}`);
  console.log(`   > contract address: ${logs.address}`);
  console.log(`   > gas used: ${result.receipt.gasUsed}`);
  console.log(`   > event: ${logs.event}`);
  console.log();
}

module.exports = async (deployer, network, accounts) => {
  const Admin = accounts[0];
  const UserA = accounts[1];
  const UserB = accounts[2];
  // const UserC = accounts[3];

  // Get deployed instance
  const TokenOneInstance = await TestTokenOne.at(TestTokenOne.address);
  const TokenTwoInstance = await TestTokenTwo.at(TestTokenTwo.address);

  // Amount to be minted
  const TokenOneAmount = new BN(21000000).mul(new BN(10).pow(new BN(6)))  // 21 million * 10**6
  const TokenTwoAmount = new BN(88888888).mul(new BN(10).pow(new BN(12))) // 88,888,888 * 10**12

  // Mint tokens to admin
  tx(await TokenOneInstance.mint(Admin, new BN(21000000).mul(new BN(10).pow(new BN(6)))), 'Mint 21,000,000 TestTokenOne to Admin');
  tx(await TokenOneInstance.mint(UserA, new BN(1000000).mul(new BN(10).pow(new BN(6)))), 'Mint 1,000,000 TestTokenOne to Admin');
  tx(await TokenTwoInstance.mint(Admin, new BN(88888888).mul(new BN(10).pow(new BN(12)))), 'Mint 88,888,888 TestTokenTwo to Admin');

  // Transfer ETH to OML
  // tx(
  //   await ReserveInstance.sendTransaction(
  //     { from: admin, value: web3.utils.toWei(new BN(100)) },
  //   ),
  //   'sendTransaction()',
  // );
};
