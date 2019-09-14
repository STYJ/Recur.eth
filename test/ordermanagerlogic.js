const BN = require('bn.js');

const OrderManagerLogic = artifacts.require('OrderManagerLogic');
const Token = artifacts.require('Token');

contract('OrderManagerLogic', accounts => {
    let admin;
    let userA;
    let userB;
    let token;
    let oml;

    it('Set up global variables', async() => {
        admin = accounts[0];
        userA = accounts[1];
        userB = accounts[2];
        token = await Token.deployed();
        oml = await OrderManagerLogic.deployed();
    })

    it('Set up token balances for admin, userA and userB', async() => {
        const amt = new BN(10).pow(new BN(24));
        const amt_stringified = amt.toString();

        await token.transfer(userA, amt_stringified, { from: admin });

        const balance = await token.balanceOf.call(userA);
        const balance_stringified = balance.toString();
        assert.equal(
            balance_stringified,
            amt_stringified,
            `userA balance (${balance_stringified}) does not match amount transferred of ${amt_stringified}`
        );
    })

    it('Create order for userA', async() => {
        const recipient = userB;
        const srcToken = token.address;
        const destToken = token.address;
        const srcQty = new BN(1000).mul(new BN(10).pow(new BN(18)));  // 1000 tokens
        const freq = 10;
        const minBlockInterval = 9;
        const maxGasPrice = 10;

        await oml.createOrder(
            recipient,
            srcToken,
            destToken,
            srcQty,
            freq,
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
        const amt = new BN(10).pow(new BN(24));
        const amt_stringified = amt.toString();

        await token.approve(oml.address, amt_stringified, { from: userA });

        const allowance = await token.allowance.call(userA, oml.address);
        const allowance_stringified = allowance.toString();
        assert.equal(
            amt_stringified,
            allowance_stringified,
            `OML's allowance of ${allowance_stringified} does not match what userA approved of ${amt_stringified}`
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



    // trigger trade without allowance
    // give allowance
    // trigger trade but min block hasnt passed
    // trigger trade






});
