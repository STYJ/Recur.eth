const BN = require('bn.js');

const OrderManagerLogic = artifacts.require("OrderManagerLogic");
const Token = artifacts.require("Token");

contract("OrderManagerLogic", accounts => {

    beforeEach('Setup global variables before each test', async() =>{
        admin = accounts[0];
        userA = accounts[1];
        userB = accounts[2];
        token = await Token.deployed();
    })

    it('Test contract setup', async() => {
        supply = new BN(21).mul(new BN(10).pow(new BN(24)));
        token = await Token.deployed();
        balance = await token.balanceOf(admin);
        assert.equal(balance.toString(), supply.toString(), "Migrations deployed incorrectly.");
        console.log(assert);
    })


    it('UserA should not be able to transfer to userB any tokens', async() => {
        try {
            supply = new BN(10).pow(new BN(24));
			await token.transfer(admin, supply, {from: userB})
			// If await passes, throw an assert fail
			assert.fail('Expected revert not received');
        } catch (error) {
        	const revertFound = error.message.search('revert') >= 0;
        	assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })




});

// contract("Token", accounts => {
//     let TokenInstance;
//
//     // beforeEach('Setup contract for each test', async function () {
//     //     TokenInstance = await Token.deployed();
//     //     console.log(TokenInstance)
//     // })
//
//     it("Token name is deployed correctly", async () => {
//         TokenInstance = await Token.deployed();
//         console.log(TokenInstance)
//         let name = await TokenInstance.name();
//         assert.equal(name, "TestToken", "The name of the deployed token is incorrect.");
//     })
// })

// contract("OrderManagerLogic", accounts => {
//     it('Should init global users, init token', async() => {
//         admin = accounts[0];
//         userA = accounts[1];
//         userB = accounts[2];
//         token = await Token.new('TestToken', 'TT', 12, new BN(21).mul(new BN(10).pow(new BN(24))));
//     })
    // // let OMLInstance;
    // //
    // // beforeEach("Setup contract for each test", async() => {
    // //     OMLInstance = await OrderManagerLogic.deployed();
    // // })
    //
    // it("has an admin", async() => {
    //     // let admin = await OMLInstance.admin();
    //     // assert.equal(admin, accounts[0], "Admin address is incorrect" )
    // })
//
//
//
// })
