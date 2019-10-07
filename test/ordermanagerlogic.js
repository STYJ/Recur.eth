const BN = require("bn.js");
const fs = require("fs");
const Helper = require("./helper.js");

const OrderManagerLogic = artifacts.require("OrderManagerLogic");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const EthTokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
const TokenConfig = JSON.parse(fs.readFileSync("./config/tokens.json", "utf8"));

contract("OrderManagerLogic", accounts => {
    let admin;
    let userA;
    let userB;
    let tokenOne;
    let tokenTwo;
    let oml;

    it("Set up global variables", async () => {
        admin = accounts[0];
        userA = accounts[1];
        userB = accounts[2];
        tokenOne = await TestTokenOne.deployed();
        tokenTwo = await TestTokenTwo.deployed();
        oml = await OrderManagerLogic.deployed();
    });

    it("Token to token order can be created", async () => {
        const recipient = userB;
        const srcToken = tokenOne.address;
        const destToken = tokenTwo.address;
        const srcQty = new BN(1000).mul(new BN(10).pow(new BN(6))); // 1000 tokenOnes per trade
        const numTrades = 5;
        const minBlockInterval = 9;
        const maxGasPrice = 10;

        await oml.createOrder(
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTrades,
            minBlockInterval,
            maxGasPrice,
            { from: userA }
        );

        const numOrders = await oml.myOrdersCount.call(userA);
        assert.equal(
            numOrders.toNumber(),
            1,
            "Order creation failed!"
        );
    });

    // it("Check that global variables in OML contract are updated correctly", async() => {
    //     // Order[] public allOrders;                           // All orders in existence
    //     // uint public numOrdersCreated;                       // Identifier for each order (increment only)
    //     // mapping(address => Order[]) public myOrders;        // Mapping from sender to sender's orders
    //     // mapping(address => uint256) public myOrdersCount;   // Mapping from sender to number of sender's orders
    //     // mapping(uint256 => uint256) public myOrdersIndex;   // Mapping from orderId to index in myOrders array
    //     // mapping(uint256 => address) public orderOwner;      // Mapping from orderId to sender
    //     // mapping(address => uint256) public gasBalances;   

    //     const expectedOrder = {
    //         orderId: new BN(0),
    //         creator: userA,
    //         recipient: userB,
    //         srcToken: tokenOne.address,
    //         destToken: tokenTwo.address,
    //         srcQty: new BN(1000).mul(new BN(10).pow(new BN(6))),
    //         numTradesLeft: new BN(5),
    //         minBlockInterval: new BN(9),
    //         lastBlockNumber: new BN(await web3.eth.getBlockNumber()),
    //         maxGasPrice: new BN(10),
    //         active: true,
    //     }
    //     const order = await oml.allOrders.call(0);

    //     // Need to delete duplicated key-value pairs
    //     delete order[0];
    //     delete order[1];
    //     delete order[2];
    //     delete order[3];
    //     delete order[4];
    //     delete order[5];
    //     delete order[6];
    //     delete order[7];
    //     delete order[8];
    //     delete order[9];
    //     delete order[10];
    //     assert.equal(
    //         order,
    //         expectedOrder,
    //         `Order created on smart contract does not match the expected order!`
    //     )
    // });

    it("Non owner cannot deactivate order", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.deactivateOrder(orderId, { from: admin });
            assert.fail(
                "Order was deactivated by someone who is not the owner!"
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Owner can deactivate order", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.deactivateOrder(orderId, { from: userA });
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected no error, got ${err} instead!`
            );
        }
        const order = await oml.myOrders.call(userA, orderId);
        assert.isFalse(
            order["active"],
            `Order with id ${orderId} failed to deactivate!`
        );
    });

    it("Cannot trigger trade if order is deactivated", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail("Trade was triggered even though order is inactive!");
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Non owner cannot reactivate order", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.reactivateOrder(orderId, { from: admin });
            assert.fail(
                "Order was reactivated by someone who is not the owner!"
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Owner can reactivate order", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.reactivateOrder(orderId, { from: userA });
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected no error, got ${err} instead!`
            );
        }
        const order = await oml.myOrders.call(userA, orderId);
        assert.isTrue(
            order["active"],
            `Order with id ${orderId} failed to reactivate!`
        );
    });

    it("Cannot trigger trade if insufficient allowance given to OML", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));

         // Reset allowance to 0
        const amt = new BN(0);
        try {
            await tokenOne.approve(oml.address, amt.toString(), {
                from: userA
            });
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected no error, got ${err} instead!`
            );
        }
        const allowance = await tokenOne.allowance.call(userA, oml.address);
        assert.equal(
            allowance.toString(),
            amt.toString(),
            `OML's allowance of ${allowance.toString()} does not match what userA approved of ${amt.toString()}`
        );

        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail(
                "Trade was triggered even though insufficient allowance!"
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Give allowance to OML", async () => {
        const amt = new BN(1000000).mul(new BN(10).pow(new BN(6))); // 1 mil tokens
        try {
            await tokenOne.approve(oml.address, amt.toString(), {
                from: userA
            });
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected no error, got ${err} instead!`
            );
        }
        const allowance = await tokenOne.allowance.call(userA, oml.address);
        assert.equal(
            allowance.toString(),
            amt.toString(),
            `OML's allowance of ${allowance.toString()} does not match what userA approved of ${amt.toString()}`
        );
    });

    it("Cannot trigger trade if min block interval has not passed", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail(
                "Trade was triggered even though min block interval has not passed!"
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Can trigger trade if min block interval has passed", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected no error, got ${err} instead!`
            );
        }
    });

    it("Token to eth order can be created", async () => {
        const recipient = userA;
        const srcToken = tokenTwo.address;
        const destToken = EthTokenAddress;
        const srcQty = new BN(88).mul(new BN(10).pow(new BN(6))); // 88 tokenTwos per trade
        const numTrades = 2;
        const minBlockInterval = 1;
        const maxGasPrice = 4;

        await oml.createOrder(
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTrades,
            minBlockInterval,
            maxGasPrice,
            { from: userB }
        );

        const numOrders = await oml.myOrdersCount.call(userB);
        assert.equal(
            numOrders.toNumber(),
            1,
            "Order creation failed!"
        );
    });
});
