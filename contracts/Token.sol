pragma solidity ^0.5.10;

import "./openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "./openzeppelin-contracts/contracts/token/ERC20/ERC20Detailed.sol";
import "./openzeppelin-contracts/contracts/token/ERC20/ERC20Mintable.sol";

contract Token is ERC20, ERC20Mintable, ERC20Detailed {

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint _supply
    ) public ERC20Detailed(_name, _symbol, _decimals) {
        mint(msg.sender, _supply);
    }

}
