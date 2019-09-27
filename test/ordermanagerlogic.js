const BN = require("bn.js");
const fs = require("fs");
const Helper = require("./helper.js");

const OrderManagerLogic = artifacts.require("OrderManagerLogic");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
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

    it("Create Token to Token (TokenOne => TokenTwo) order for userA", async () => {
        const recipient = userB;
        const srcToken = tokenOne.address;
        const destToken = tokenTwo.address;
        const srcQty = new BN(1000).mul(new BN(10).pow(new BN(6))); // 1000 tokenOnes per trade
        const numTrades = 5;
        const minBlockInterval = 8;
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
            "Order creation for userA failed"
        );
    });

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
                `Expected revert, got ${err} instead`
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
                `Expected no error, got ${err} instead`
            );
        }
        const order = await oml.myOrders.call(userA, orderId);
        assert.isFalse(
            order["active"],
            `Order with id ${orderId} failed to deactivate`
        );
    });

    it("Cannot trigger trade if order is deactivated", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail("Trade was triggered even though order is innactive!");
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead`
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
                `Expected revert, got ${err} instead`
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
                `Expected no error, got ${err} instead`
            );
        }
        const order = await oml.myOrders.call(userA, orderId);
        assert.isTrue(
            order["active"],
            `Order with id ${orderId} failed to reactivate`
        );
    });

    it("Cannot trigger trade if no / insufficient allowance given to OML", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail(
                "Trade was triggered even though no allowance was given!"
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead`
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
                `Expected no error, got ${err} instead`
            );
        }
        const allowance = await tokenOne.allowance.call(userA, oml.address);
        assert.equal(
            amt.toString(),
            allowance.toString(),
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
                `Expected revert, got ${err} instead`
            );
        }
    });

    it("Can trigger trade if min block interval has passed", async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        const order = await oml.myOrders.call(userA, orderId);
        const srcQty = order["srcQty"];
        const balanceBeforeTradeOML = await tokenOne.balanceOf.call(
            oml.address
        );
        const balanceBeforeTradeUserA = await tokenOne.balanceOf.call(userA);

        try {
            await oml.triggerTrade(orderId, { from: admin });
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected no error, got ${err} instead`
            );
        }

        const balanceAfterTradeOML = await tokenOne.balanceOf.call(oml.address);
        const balanceAfterTradeUserA = await tokenOne.balanceOf.call(userA);

        const expectedBalanceOML = balanceBeforeTradeOML.add(srcQty);
        const expectedBalanceUserA = balanceBeforeTradeUserA.sub(srcQty);

        assert.equal(
            balanceAfterTradeOML.toString(),
            expectedBalanceOML.toString(),
            `OML's balance is incorrect, expected ${expectedBalanceOML.toString()} but got ${balanceAfterTradeOML.toString()} instead.`
        );

        assert.equal(
            balanceAfterTradeUserA.toString(),
            expectedBalanceUserA.toString(),
            `UserA's balance is incorrect, expected ${expectedBalanceOML.toString()} but got ${balanceAfterTradeOML.toString()} instead.`
        );
    });
});
