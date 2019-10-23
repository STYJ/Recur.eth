const BN = require("bn.js");
const fs = require("fs");
const Helper = require("./helper.js");

const OrderManagerLogic = artifacts.require("OrderManagerLogic");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const EthTokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const NullAddress = "0x".padEnd(42, "0");

contract("OrderManagerLogic", accounts => {
    let admin;
    let userA;
    let userB;
    let userC;
    let tokenOne;
    let tokenTwo;
    let oml;
    let tokenToTokenNewOrder;
    let tokenToTokenUpdatedOrder;
    let ethToTokenNewOrder;

    it("Set up global variables", async () => {
        admin = accounts[0];
        userA = accounts[1];
        userB = accounts[2];
        userC = accounts[3];
        tokenOne = await TestTokenOne.deployed();
        tokenTwo = await TestTokenTwo.deployed();
        oml = await OrderManagerLogic.deployed();
        tokenToTokenNewOrder = {
            creator: userA,
            recipient: userB,
            srcToken: tokenOne.address,
            destToken: tokenTwo.address,
            srcQty: new BN(100).mul(new BN(10).pow(new BN(6))), // 100 tokenOnes per trade
            numTradesLeft: 5,
            minBlockInterval: 8,
            maxGasPrice: 10
        };

        tokenToTokenUpdatedOrder = {
            creator: userA,
            recipient: userC,
            srcToken: tokenOne.address,
            destToken: tokenTwo.address,
            srcQty: new BN(1337).mul(new BN(10).pow(new BN(6))), // 1337 tokenOnes per trade
            numTradesLeft: 1,
            minBlockInterval: 1,
            maxGasPrice: 1
        };
        ethToTokenNewOrder = {
            creator: userB,
            recipient: userA,
            srcToken: tokenTwo.address,
            destToken: EthTokenAddress,
            srcQty: new BN(8).mul(new BN(10).pow(new BN(6))), // 8 tokenTwos per trade
            numTrades: 2,
            minBlockInterval: 1,
            maxGasPrice: 4
        };
    });

    it("Cannot create order if recipient is address(0)", async () => {
        const {
            creator,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                NullAddress,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was created even though recipient is ${NullAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if srcToken is address(0)", async () => {
        const {
            creator,
            recipient,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                NullAddress,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was created even though srcToken is ${NullAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if srcToken is ETH", async () => {
        const {
            creator,
            recipient,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                EthTokenAddress,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was created even though srcToken is ${EthTokenAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if destToken is address(0)", async () => {
        const {
            creator,
            recipient,
            srcToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                srcToken,
                NullAddress,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was created even though destToken is ${NullAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if srcQty <= 0", async () => {
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                srcToken,
                destToken,
                new BN(0),
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(`Order was created even though srcQty is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if numTradesLeft <= 0", async () => {
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                srcToken,
                destToken,
                srcQty,
                new BN(0),
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(`Order was created even though numTradesLeft is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if minBlockInterval <= 0", async () => {
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            maxGasPrice
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                new BN(0),
                maxGasPrice,
                { from: creator }
            );
            assert.fail(`Order was created even though minBlockInterval is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot create order if maxGasPrice <= 0", async () => {
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval
        } = tokenToTokenNewOrder;

        try {
            await oml.createOrder(
                recipient,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                new BN(0),
                { from: creator }
            );
            assert.fail(`Order was created even though maxGasPrice is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Token to token order can be created", async () => {
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;
        await oml.createOrder(
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice,
            { from: creator }
        );

        const numOrders = await oml.myOrdersCount.call(userA);
        assert.equal(numOrders.toNumber(), 1, "Order creation failed!");
    });

    it("Check that the previously created order is stored correctly in the smart contract", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenNewOrder;
        const expectedOrder = {
            orderId: new BN(0).toString(),
            creator: creator,
            recipient: recipient,
            srcToken: srcToken,
            destToken: destToken,
            srcQty: srcQty.toString(),
            numTradesLeft: numTradesLeft.toString(),
            minBlockInterval: minBlockInterval.toString(),
            lastBlockNumber: await web3.eth.getBlockNumber(),
            maxGasPrice: maxGasPrice.toString(),
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
            // It expected a revert but instead, it got assert.fail
            // assert(expression, message to print if expression is false)
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
            assert(false, `Expected no error, got ${err} instead!`);
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
            assert(false, `Expected no error, got ${err} instead!`);
        }
        const order = await oml.myOrders.call(userA, orderId);
        assert.isTrue(
            order["active"],
            `Order with id ${orderId} failed to reactivate!`
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

    it("Cannot trigger trade if insufficient allowance given to OML", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
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
        const amt = new BN(100).mul(new BN(10).pow(new BN(6))); // 100 tokens
        try {
            await tokenOne.approve(oml.address, amt.toString(), {
                from: userA
            });
        } catch (err) {
            assert(false, `Expected no error, got ${err} instead!`);
        }
        const allowance = await tokenOne.allowance.call(userA, oml.address);
        assert.equal(
            allowance.toString(),
            amt.toString(),
            `OML's allowance of does not match the expected amount of allowance that was approved!`
        );
    });

    it("Can trigger trade if min block interval has passed", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
        } catch (err) {
            assert(false, `Expected no error, got ${err} instead!`);
        }
    });

    it("Order is updated accordingly after order is taken", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const { numTradesLeft } = tokenToTokenNewOrder;
        const lastBlockNumber = await web3.eth.getBlockNumber();
        const order = await oml.allOrders.call(orderId);
        assert.equal(
            order["numTradesLeft"],
            new BN(numTradesLeft).sub(new BN(1)).toString(),
            `The actual numTradesLeft does not match the expected numTradesLeft!`
        );
        assert.equal(
            order["lastBlockNumber"],
            lastBlockNumber,
            `The actual lastBlockNumber does not match the expected lastBlockNumber!`
        );
    });

    it("Non owner cannot update order", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;
        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: userB }
            );
            assert.fail(`Order was updated by someone who is not the owner!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if recipient is address(0)", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                NullAddress,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was updated even though recipient is ${NullAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if srcToken is address(0)", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                NullAddress,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was updated even though srcToken is ${NullAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if srcToken is ETH", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                EthTokenAddress,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was updated even though srcToken is ${EthTokenAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if destToken is address(0)", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                NullAddress,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(
                `Order was updated even though destToken is ${NullAddress}!`
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if srcQty <= 0", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                destToken,
                new BN(0),
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(`Order was updated even though srcQty is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if numTradesLeft <= 0", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                destToken,
                srcQty,
                new BN(0),
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
            assert.fail(`Order was updated even though numTradesLeft is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if minBlockInterval <= 0", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                new BN(0),
                maxGasPrice,
                { from: creator }
            );
            assert.fail(`Order was updated even though minBlockInterval is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Cannot update order if maxGasPrice <= 0", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval
        } = tokenToTokenUpdatedOrder;

        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                new BN(0),
                { from: creator }
            );
            assert.fail(`Order was updated even though maxGasPrice is 0!`);
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    it("Owner can update order and is reflected correctly in the smart contract", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;
        try {
            await oml.updateOrder(
                orderId,
                recipient,
                srcToken,
                destToken,
                srcQty,
                numTradesLeft,
                minBlockInterval,
                maxGasPrice,
                { from: creator }
            );
        } catch (err) {
            assert(false, `Expected no error, got ${err} instead!`);
        }
    });

    it("Check that the previously updated order is stored correctly in OML contract", async () => {
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        const {
            creator,
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTradesLeft,
            minBlockInterval,
            maxGasPrice
        } = tokenToTokenUpdatedOrder;
        const expectedOrder = {
            orderId: new BN(0).toString(),
            creator: creator,
            recipient: recipient,
            srcToken: srcToken,
            destToken: destToken,
            srcQty: srcQty.toString(),
            numTradesLeft: numTradesLeft.toString(),
            minBlockInterval: minBlockInterval.toString(),
            lastBlockNumber: await web3.eth.getBlockNumber(),
            maxGasPrice: maxGasPrice.toString(),
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

    it("Check that the variables in the OML contract are reflected correctly after order was updated", async () => {
        // Basically nothing should change because we didn't create any new orders
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

    it("Trade cannot be triggered if numTradesLeft is 0", async () => {
        // Give allowance to perform one trade
        const amt = new BN(1337).mul(new BN(10).pow(new BN(6))); // 1337 tokens
        try {
            await tokenOne.approve(oml.address, amt.toString(), {
                from: userA
            });
        } catch (err) {
            assert(false, `Expected no error, got ${err} instead!`);
        }

        // perform a trade to reduce numTradesLeft to 0
        const orderId = (await oml.numOrdersCreated.call()).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
        } catch (err) {
            assert(false, `Expected no error, got ${err} instead!`);
        }

        // Give allowance again to perform trade again
        try {
            await tokenOne.approve(oml.address, amt.toString(), {
                from: userA
            });
        } catch (err) {
            assert(false, `Expected no error, got ${err} instead!`);
        }

        // Try to trigger trade even though numTradesLeft is 0
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail(
                "Trade was triggered even though numTradesLeft is 0!"
            );
        } catch (err) {
            assert(
                Helper.isRevertErrorMessage(err),
                `Expected revert, got ${err} instead!`
            );
        }
    });

    /* it("Token to eth order can be created", async () => {
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
    }); */
});
