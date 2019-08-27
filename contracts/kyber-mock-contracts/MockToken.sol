pragma solidity ^0.5.10;

import "../openzeppelin-contracts/contracts/token/ERC20/ERC20Detailed.sol";
import "../openzeppelin-contracts/contracts/token/ERC20/ERC20Mintable.sol";


// constructors are executed in the following order:
// 1. ERC20Detailed
// 2. ERC20Mintable
// 3. KyberNetworkCrystal
contract MockToken is ERC20Detailed, ERC20Mintable {

    // Functions
    /**
     * @dev Contract constructor
     * @param _name Name of token
     * @param _symbol Symbol of token
     * @param _decimals Number of decimals
     * @param _supply Total supply of the token
     */
    constructor (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _supply
    ) public ERC20Detailed(_name, _symbol, _decimals) {
        mint(msg.sender, _supply);
    }
}
