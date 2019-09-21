const BN = require('bn.js');
const fs = require('fs');

const OrderManagerLogic = artifacts.require('OrderManagerLogic');
const TestTokenOne = artifacts.require('TestTokenOne');
const TestTokenTwo = artifacts.require('TestTokenTwo');
const TokenConfig = JSON.parse(fs.readFileSync('../config/tokens.json', 'utf8'));

contract('OrderManagerLogic', accounts => {
    let admin;
    let userA;
    let userB;
    let tokenOne;
    let tokenTwo;
    let oml;

    it('Set up global variables', async() => {
        admin = accounts[0];
        userA = accounts[1];
        userB = accounts[2];
        tokenOne = await TestTokenOne.deployed();
        tokenTwo = await TestTokenTwo.deployed();
        oml = await OrderManagerLogic.deployed();
    })

    it('Create TokenOne To TokenTwo order for userA', async() => {
        const recipient = userB;
        const srcToken = tokenOne.address;
        const destToken = tokenTwo.address;
        const srcQty = new BN(1000).mul(new BN(10).pow(new BN(6))); // 1000 tokenOnes per trade
        const numTrades = 5;
        const minBlockInterval = 8;
        const maxGasPrice = 10;

        const orderId = await oml.createOrder(
            recipient,
            srcToken,
            destToken,
            srcQty,
            numTrades,
            minBlockInterval,
            maxGasPrice,
            { from: userA }
        )

        const numOrders = await oml.myOrdersCount.call(userA);
        assert.equal(numOrders.toNumber(), 1, 'Order creation for userA failed');
    })

    it('Non owner cannot deactivate order', async() => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.deactivateOrder(orderId, { from: admin });
            assert.fail('Expected revert not received');
        } catch (err) {
            const revertFound = err.message.search('revert') >= 0;
        	assert(revertFound, `Expected "revert", got ${err} instead`);
        }
    })

    it('Owner can deactivate order', async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        await oml.deactivateOrder(orderId, { from: userA });
        const order = await oml.myOrders.call(userA, orderId);
        assert.isFalse(order['active'], `Order with id ${orderId} failed to deactivate`);
    })

    it('Cannot trigger trade if order is deactivated', async() => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail('Expected revert not received');
        } catch (err) {
            const revertFound = err.message.search('revert') >= 0;
        	assert(revertFound, `Expected "revert", got ${err} instead`);
        }
    })

    it('Non owner cannot reactivate order', async() => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.reactivateOrder(orderId, { from: admin });
            assert.fail('Expected revert not received');
        } catch (err) {
            const revertFound = err.message.search('revert') >= 0;
        	assert(revertFound, `Expected "revert", got ${err} instead`);
        }
    })

    it('Owner can reactivate order', async () => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        await oml.reactivateOrder(orderId, { from: userA });
        const order = await oml.myOrders.call(userA, orderId);
        assert.isTrue(order['active'], `Order with id ${orderId} failed to reactivate`);
    })

    it('Cannot trigger trade if insufficient allowance given to OML', async() => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail('Expected revert not received');
        } catch (err) {
            const revertFound = err.message.search('revert') >= 0;
        	assert(revertFound, `Expected "revert", got ${err} instead`);
        }
    })

    it('Give allowance to OML', async() => {
        const amt = new BN(1000000).mul(new BN(10).pow(new BN(6))); // 1 mil tokens

        await tokenOne.approve(oml.address, amt.toString(), { from: userA });

        const allowance = await tokenOne.allowance.call(userA, oml.address);
        assert.equal(
            amt.toString(),
            allowance.toString(),
            `OML's allowance of ${allowance.toString()} does not match what userA approved of ${amt.toString()}`
        )
    })

    it('Cannot trigger trade if min block interval has not passed', async() => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        try {
            await oml.triggerTrade(orderId, { from: admin });
            assert.fail('Expected revert not received');
        } catch (err) {
            const revertFound = err.message.search('revert') >= 0;
        	assert(revertFound, `Expected "revert", got ${err} instead`);
        }
    })

    it('Can trigger trade if min block interval has passed', async() => {
        const orderId = (await oml.myOrdersCount.call(userA)).sub(new BN(1));
        const order = await oml.myOrders.call(userA, orderId);
        const srcQty = order['srcQty'];
        await oml.triggerTrade(orderId, { from: admin });

        const balance = await tokenOne.balanceOf.call(oml.address);

        assert.equal(
            balance.toString(),
            srcQty.toString(),
            `omls balance is incorrect, it should be ${srcQty.toString()}`
        );
    })





});
