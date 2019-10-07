const BN = require("bn.js");
const fs = require("fs");
const Helper = require("./helper.js");

const OrderManagerLogic = artifacts.require("OrderManagerLogic");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const EthTokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
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
        assert.equal(numOrders.toNumber(), 1, "Order creation failed!");
    });

    it("Check that the previously created order is stored correctly in OML contract", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const expectedOrder = {
            orderId: new BN(0).toString(),
            creator: userA,
            recipient: userB,
            srcToken: tokenOne.address,
            destToken: tokenTwo.address,
            srcQty: new BN(1000).mul(new BN(10).pow(new BN(6))).toString(),
            numTradesLeft: new BN(5).toString(),
            minBlockInterval: new BN(9).toString(),
            lastBlockNumber: await web3.eth.getBlockNumber(),
            maxGasPrice: new BN(10).toString(),
            active: true
        };
        const globalOrder = await oml.allOrders.call(orderId);

        Object.keys(expectedOrder).forEach(key => {
            assert.equal(
                globalOrder[key],
                expectedOrder[key],
                `The ${key} of the order with id ${orderId} does not match the expected ${key}!`
            );
        });

        const myOrder = await oml.myOrders.call(userA, orderId);

        Object.keys(expectedOrder).forEach(key => {
            assert.equal(
                myOrder[key],
                expectedOrder[key],
                `The ${key} of the order with id ${orderId} does not match the expected ${key}!`
            );
        });
    });

    it("Check that the variables in the OML contract are updated correctly after order was created", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));

        const numOrdersCreated = await oml.numOrdersCreated.call();
        const myOrdersCount = await oml.myOrdersCount.call(userA);
        const myOrdersIndex = await oml.myOrdersIndex.call(orderId);
        const orderOwner = await oml.orderOwner.call(orderId);

        const expectedNumOrdersCreated = 1;
        const expectedMyOrdersCount = 1;
        const expectedMyOrdersIndex = 0;
        const expectedOrderOwner = userA;

        assert.equal(
            numOrdersCreated,
            expectedNumOrdersCreated,
            `Number of orders created does not match the expected number of orders created!`
        );
        assert.equal(
            myOrdersCount,
            expectedMyOrdersCount,
            `My orders count does not match the expected my orders count!`
        );
        assert.equal(
            myOrdersIndex,
            expectedMyOrdersIndex,
            `My orders index does not match the expected my orders index!`
        );
        assert.equal(
            orderOwner,
            expectedOrderOwner,
            `Owner of order does not match the expected owner of order!`
        );
    });

    it("Non owner cannot deactivate order", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
            `OML's allowance of does not match the expected amount of allowance that was approved!`
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
            `OML's allowance of does not match the expected amount of allowance that was approved!`
        );
    });

    it("Cannot trigger trade if min block interval has not passed", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        assert.equal(numOrders.toNumber(), 1, "Order creation failed!");
    });
});
