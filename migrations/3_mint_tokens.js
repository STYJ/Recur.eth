/* global artifacts, web3 */
/* eslint-disable no-unused-vars */
const BN = require("bn.js");

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const OrderManagerLogic = artifacts.require("OrderManagerLogic");

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
      new BN(8).mul(new BN(1000000)).mul(new BN(10).pow(new BN(6)))
    ),
    "Mint 8,000,000 TestTokenOne to Admin"
  );
  tx(
    await TokenOneInstance.mint(
      UserA,
      new BN(1).mul(new BN(1000000)).mul(new BN(10).pow(new BN(6)))
    ),
    "Mint 1,000,000 TestTokenOne to UserA"
  );
  tx(
    await TokenOneInstance.mint(
      OML.address,
      new BN(12).mul(new BN(1000000)).mul(new BN(10).pow(new BN(6)))
    ),
    "Mint 12,000,000 TestTokenOne to OML"
  );
  tx(
    await TokenTwoInstance.mint(
      Admin,
      new BN(3).mul(new BN(1000000)).mul(new BN(10).pow(new BN(6)))
    ),
    "Mint 3,000,000 TestTokenTwo to Admin"
  );
  tx(
    await TokenTwoInstance.mint(
      UserB,
      new BN(1).mul(new BN(1000000)).mul(new BN(10).pow(new BN(6)))
    ),
    "Mint 1,000,000 TestTokenTwo to UserB"
  );
  tx(
    await TokenTwoInstance.mint(
      OML.address,
      new BN(5).mul(new BN(1000000)).mul(new BN(10).pow(new BN(6)))
    ),
    "Mint 5,000,000 TestTokenTwo to OML"
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
