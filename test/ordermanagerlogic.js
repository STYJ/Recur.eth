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
        const amt = new BN(10).pow(new BN(24)); // 1 mil tokens

        await token.transfer(userA, amt.toString(), { from: admin }); // Transfer 1 mil tokens from admin to userA

        const balance = await token.balanceOf.call(userA);

        assert.equal(
            balance.toString(),
            amt.toString(),
            `userA balance (${balance.toString()}) does not match amount transferred of ${amt.toString()}`
        );
    })

    it('Create order for userA', async() => {
        const recipient = userB;
        const srcToken = token.address;
        const destToken = token.address; // Change this later
        const srcQty = new BN(1000).mul(new BN(10).pow(new BN(18))); // 1000 tokens
        const freq = 10;
        const minBlockInterval = 8;
        const maxGasPrice = 10;

        const orderId = await oml.createOrder(
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

        await token.approve(oml.address, amt.toString(), { from: userA });

        const allowance = await token.allowance.call(userA, oml.address);
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

        const balance = await token.balanceOf.call(oml.address);

        assert.equal(
            balance.toString(),
            srcQty.toString(),
            `omls balance is incorrect, it should be ${srcQty.toString()}`
        );
    })





});
