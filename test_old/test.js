// All code examples in this guide have not been audited and should not be used in production.
// If so, it is done at your own risk!

/* global artifacts, web3 */
/* eslint-disable no-underscore-dangle, no-unused-vars */
const BN = require('bn.js');
const moment = require('moment');

const OrderManagerLogic = artifacts.require("OrderManagerLogic.sol");
const Token = artifacts.require("Token.sol");

function stdlog(input) {
    console.log(`${moment().format('DD-MM-YY HH:mm:ss:SSS')}] ${input}`);
}

function tx(result, call) {
    const logs = result.logs.length > 0 ? result.logs[0] : { address: null, event: null };

    console.log();
    console.log(`   ${call}`);
    console.log('   ------------------------');
    console.log(`   > transaction hash: ${result.tx}`);
    console.log(`   > contract address: ${logs.address}`);
    console.log(`   > gas used: ${result.receipt.gasUsed}`);
    console.log(`   > event: ${logs.event}`);
    console.log();
}

module.exports = async (callback) => {
    const accounts = web3.eth.accounts._provider.addresses;
    const admin = accounts[0];
    const userA = accounts[1];
    const userB = accounts[2];

    // Getting instances
    const OMLInstance = await OrderManagerLogic.at(OrderManagerLogic.address);
    const TokenInstance = await Token.at(Token.address);

    stdlog('- START -');
    stdlog(`OrderManagerLogic (${OMLInstance.address})`);

    stdlog(`- Token balances init -`)
    stdlog(
        `${await TokenInstance.name()} balance of ${admin} = ${await TokenInstance.balanceOf(admin)}`,
    );
    stdlog(
        `${await TokenInstance.name()} balance of ${userA} = ${await TokenInstance.balanceOf(userA)}`,
    );
    stdlog(
        `${await TokenInstance.name()} balance of ${userB} = ${await TokenInstance.balanceOf(userB)}`,
    );

    stdlog(`- Transferring 1m ${await TokenInstance.name()} from ${admin} to ${userA} -`);
    var result = await TokenInstance.transfer(
        userA,
        new BN(10).pow(new BN(24)),
        { from: admin }
    );
    tx(result, "Transfer Tokens")

    stdlog(`- Token balances before -`)
    stdlog(
        `${await TokenInstance.name()} balance of ${admin} = ${await TokenInstance.balanceOf(admin)}`,
    );
    stdlog(
        `${await TokenInstance.name()} balance of ${userA} = ${await TokenInstance.balanceOf(userA)}`,
    );
    stdlog(
        `${await TokenInstance.name()} balance of ${userB} = ${await TokenInstance.balanceOf(userB)}`,
    );

    stdlog(`- Creating Order for ${userA} -`);
    result = await OMLInstance.createOrder(
        userB,                                              // recipient
        TokenInstance.address,                              // srcToken
        TokenInstance.address,                              // destToken
        new BN(10).pow(new BN(21)),                         // srcQty = 10**21
        10,                                                 // frequency
        1,                                                  // minBlockInterval
        13,                                                 // maxGasPrice
        { from: userA }
    )
    var id = result.logs[0].args[0].toString();
    tx(result, "Order Creation");

    // // Deactivate order
    // var id = result.logs[0].args[0].toString();
    // result = await OMLInstance.deactivateOrder(id, {from: userA});
    // tx(result, "Deactivating Order To Test Require");
    //
    // // Try to triggerTrade
    // result = await OMLInstance.triggerTrade(id, {from: admin});
    // tx(result, "Trigger Trade failed cause order is deactivated");
    //
    // // Activate order
    // result = await OMLInstance.reactivateOrder(id, {from: userA});
    // tx(result, "Reactivating Order To Test Require");
    //
    // // Check allowance is sufficient

    stdlog(`- Approving TokenInstance Contract to spend frequency * srcQty tokens -`)
    var result = await TokenInstance.approve(
        OMLInstance.address,                                // Spender
        new BN(10).pow(new BN(22)),                         // Allowance = frequency * srcQty
        { from: userA }
    );
    tx(result, "Approve TokenInstance");

    stdlog(`- Triggering trade to transfer some tokens to recipient -`)
    result = await OMLInstance.triggerTrade(id, {from: admin});
    tx(result, "Trigger Trade")
    stdlog(`- Token balances after -`)
    stdlog(
        `${await TokenInstance.name()} balance of ${admin} = ${await TokenInstance.balanceOf(admin)}`,
    );
    stdlog(
        `${await TokenInstance.name()} balance of ${userA} = ${await TokenInstance.balanceOf(userA)}`,
    );
    stdlog(
        `${await TokenInstance.name()} balance of ${userB} = ${await TokenInstance.balanceOf(userB)}`,
    );




  // stdlog(
  //   `KNC balance of ${userWallet} = ${web3.utils.fromWei(await KNCInstance.balanceOf(userWallet))}`,
  // );
  // stdlog(
  //   `OMG balance of ${userWallet} = ${web3.utils.fromWei(await OMGInstance.balanceOf(userWallet))}`,
  // );
  // stdlog(
  //   `MANA balance of ${userWallet} = ${web3.utils.fromWei(
  //     await MANAInstance.balanceOf(userWallet),
  //   )}`,
  // );
  //
  // ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
  //   ETH_ADDRESS, // srcToken
  //   KNC.address, // destToken
  //   web3.utils.toWei(new BN(1)), // srcQty
  // ));
  //
  // // Perform an ETH to KNC trade
  // result = await NetworkProxyInstance.trade(
  //   ETH_ADDRESS, // srcToken
  //   web3.utils.toWei(new BN(1)), // srcAmount
  //   KNC.address, // destToken
  //   userWallet, // destAddress
  //   web3.utils.toWei(new BN(1000000)), // maxDestAmount
  //   expectedRate, // minConversionRate
  //   '0x0000000000000000000000000000000000000000', // walletId
  //   { from: userWallet, value: web3.utils.toWei(new BN(1)) },
  // );
  // tx(result, 'ETH <-> KNC trade()');
  //
  // // Approve the KyberNetwork contract to spend user's tokens
  // await KNCInstance.approve(NetworkProxy.address, web3.utils.toWei(new BN(100000)), {
  //   from: userWallet,
  // });
  //
  // ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
  //   KNC.address, // srcToken
  //   OMG.address, // destToken
  //   web3.utils.toWei(new BN(100)), // srcQty
  // ));
  //
  // result = await NetworkProxyInstance.trade(
  //   KNC.address, // srcToken
  //   web3.utils.toWei(new BN(100)), // srcAmount
  //   OMG.address, // destToken
  //   userWallet, // destAddress
  //   web3.utils.toWei(new BN(1000000)), // maxDestAmount
  //   expectedRate, // minConversionRate
  //   '0x0000000000000000000000000000000000000000', // walletId
  //   { from: userWallet },
  // );
  // tx(result, 'KNC <-> OMG trade()');
  //
  // ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
  //   KNC.address, // srcToken
  //   MANA.address, // destToken
  //   web3.utils.toWei(new BN(100)), // srcQty
  // ));
  //
  // result = await NetworkProxyInstance.trade(
  //   KNC.address, // srcToken
  //   web3.utils.toWei(new BN(100)), // srcAmount
  //   MANA.address, // destToken
  //   userWallet, // destAddress
  //   web3.utils.toWei(new BN(1000000)), // maxDestAmount
  //   expectedRate, // minConversionRate
  //   '0x0000000000000000000000000000000000000000', // walletId
  //   { from: userWallet },
  // );
  // tx(result, 'KNC <-> MANA trade()');
  //
  // stdlog(
  //   `ETH balance of ${userWallet} = ${web3.utils.fromWei(await web3.eth.getBalance(userWallet))}`,
  // );
  // stdlog(
  //   `KNC balance of ${userWallet} = ${web3.utils.fromWei(await KNCInstance.balanceOf(userWallet))}`,
  // );
  // stdlog(
  //   `OMG balance of ${userWallet} = ${web3.utils.fromWei(await OMGInstance.balanceOf(userWallet))}`,
  // );
  // stdlog(
  //   `MANA balance of ${userWallet} = ${web3.utils.fromWei(
  //     await MANAInstance.balanceOf(userWallet),
  //   )}`,
  // );

  stdlog('- END -');
  callback();
};
