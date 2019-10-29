pragma solidity ^0.5.10;

import "./kyber-mock-contracts/KyberNetworkProxyInterface.sol";
import "./kyber-mock-contracts/Withdrawable.sol";
import "./openzeppelin-contracts/contracts/token/ERC20/SafeERC20.sol";
import "./openzeppelin-contracts/contracts/token/ERC20/ERC20Detailed.sol";
import "./openzeppelin-contracts/contracts/math/SafeMath.sol";

contract OrderManagerLogic is Withdrawable {
    /********************************************************/
    /* OrderManagerLogic constants, variables and functions */
    /********************************************************/

    /* Directives */
    using SafeERC20 for ERC20Detailed;
    using SafeMath for uint;

    /* Order struct */
    struct Order {
        uint orderId;                                   // Unique identifier of Order
        address creator;                                // Address of creator of order
        address payable recipient;                      // Address of recipient of order
        ERC20Detailed srcToken;                         // Source token address
        ERC20Detailed destToken;                        // Destination token address
        uint srcQty;                                    // Src quantity per trade
        uint numTradesLeft;                             // Number of trades left
        uint minBlockInterval;                          // Minimum block interval between trades
        uint lastBlockNumber;                           // Block number of last successful trade
        uint maxGasPrice;                               // Max gas price (in wei) of a trade
        bool active;                                    // If order is still active
    }

    /* Variables */
    uint internal totalGasCosts = 10**6;                // Total gas used by all orders to date
    uint internal numTradesCompleted = 1;               // Number of trades completed to date
    Order[] public allOrders;                           // All orders in existence
    uint public numOrdersCreated;                       // Identifier for each order (increment only)
    mapping(address => Order[]) public myOrders;        // Mapping from sender to sender's orders
    mapping(address => uint256) public myOrdersCount;   // Mapping from sender to number of sender's orders
    mapping(uint256 => uint256) public myOrdersIndex;   // Mapping from orderId to index in myOrders array
    mapping(uint256 => address) public orderOwner;      // Mapping from orderId to creator
    
    /* Events */
    event CreateOrder(
        uint indexed orderId,
        address indexed sender
    );

    event UpdateOrder(uint indexed orderId);

    event ActivateOrder(
        uint indexed orderId,
        address indexed sender
    );

    event DeactivateOrder(
        uint indexed orderId,
        address indexed sender
    );

    event TriggerOrder(
        uint indexed orderId,
        address indexed triggerer
    );
    
    event LogDeposit(address indexed sender);

    /* Modifiers */
    modifier onlyOrderOwner(uint orderId) { // Modifier
        require(
            msg.sender == orderOwner[orderId],
            "Only the owner of this order can configure it!"
        );
        _;
    }

    /* Functions */
    /**
     * @dev Contract constructor
     * @param _kyberNetworkProxyContract KyberNetworkProxy contract address
     * @param _admin Admin address for the OrderManagerLogic contract
     */
    constructor (
        KyberNetworkProxyInterface _kyberNetworkProxyContract,
        address _admin
    ) public Withdrawable(_admin) {
        require(_admin != address(0), "Admin cannot be the null address!");
        require(address(_kyberNetworkProxyContract) != address(0), "KyberNetworkProxy contract address cannot be the null address!");
        kyberNetworkProxyContract = _kyberNetworkProxyContract;
    }

    function createOrder(
        address payable _recipient,
        ERC20Detailed _srcToken,
        ERC20Detailed _destToken,
        uint _srcQty,
        uint _numTradesLeft,
        uint _minBlockInterval,
        uint _maxGasPrice
    ) public returns (uint) {
        require(_recipient != address(0), "Recipient cannot be the null address!");
        require(address(_srcToken) != address(0), "SrcToken cannot be the null address!");
        require(address(_srcToken) != address(ETH_TOKEN_ADDRESS), "SrcToken cannot be the ETH address!");
        require(address(_destToken) != address(0), "DestToken cannot be the null address!");
        require(_srcQty > 0, "SrcQty is too low!");
        require(_numTradesLeft > 0, "Number of trades left is too low!");
        require(_minBlockInterval > 0, "Min number of blocks between trades is too low!");
        require(_maxGasPrice > 0, "Max gas price is too low!");

        uint orderId = numOrdersCreated;

        Order memory newOrder = Order(
            orderId,                                    // orderId
            msg.sender,                                 // creator
            _recipient,                                 // recipient
            _srcToken,                                  // srcToken
            _destToken,                                 // destToken
            _srcQty,                                    // srcQty
            _numTradesLeft,                             // numTradesLeft
            _minBlockInterval,                          // minBlockInterval
            block.number,                               // lastBlockNumber
            _maxGasPrice,                               // maxGasPrice
            true                                        // active
        );

        // Add newOrder into allOrders
        allOrders.push(newOrder);

        // Add newOrder into myOrders
        myOrders[msg.sender].push(newOrder);

        // Track index of newOrder in myOrders array
        myOrdersIndex[orderId] = myOrdersCount[msg.sender];

        // Incrementing my number of orders
        myOrdersCount[msg.sender] ++;

        // Tracking owner of order
        orderOwner[orderId] = msg.sender;

        // Incrementing number of orders
        numOrdersCreated ++;

        // Log the order creation event
        emit CreateOrder(orderId, msg.sender);
        
        // Return the orderId
        return orderId;
    }

    function triggerTrade(uint _orderId) public {
        // Get initial gas balance
        uint initialGas = gasleft();

        // Check that order is still active
        Order memory order = allOrders[_orderId];
        require(order.active, "Order is inactive!");

        // Check min block interval has passed
        require(
            block.number > order.lastBlockNumber.add(order.minBlockInterval),
            "Min block interval has not passed!"
        );

        // Check that numTradesLeft is more than 0
        require(
            order.numTradesLeft > 0,
            "NumTradesLeft needs to be greater than 0!"
        );

        // Check that allowance is sufficient
        require(order.srcToken.allowance(
            order.creator, address(this)) >= order.srcQty,
            "Insufficient token allowance!"
        );

        // Update numTradesLeft and lastBlockNumber
        allOrders[_orderId].numTradesLeft = allOrders[_orderId].numTradesLeft.sub(1);
        allOrders[_orderId].lastBlockNumber = block.number;

        // Execute trade the trade
        swapTokenToToken(order.creator, order.recipient, order.srcToken, order.srcQty, order.destToken, calculateFees(allOrders[_orderId].maxGasPrice));

        // Get gas remaining
        uint diff = initialGas.sub(gasleft());       
        
        // Update totalGasCosts and numTradesCompleted
        totalGasCosts = totalGasCosts.add(diff); 
        numTradesCompleted = numTradesCompleted.add(1);
        
        emit TriggerOrder(_orderId, msg.sender);
    }
    
    function updateOrder(
        uint _orderId,
        address payable _recipient,
        ERC20Detailed _srcToken,
        ERC20Detailed _destToken,
        uint _srcQty,
        uint _numTradesLeft,
        uint _minBlockInterval,
        uint _maxGasPrice
    ) public onlyOrderOwner(_orderId) returns(bool) {
        require(_recipient != address(0), "Recipient cannot be the null address!");
        require(address(_srcToken) != address(0), "SrcToken cannot be the null address!");
        require(address(_srcToken) != address(ETH_TOKEN_ADDRESS), "SrcToken cannot be the ETH address!");
        require(address(_destToken) != address(0), "DestToken cannot be the null address!");
        require(_srcQty > 0, "SrcQty is too low!");
        require(_numTradesLeft > 0, "Number of trades left is too low!");
        require(_minBlockInterval > 0, "Min number of blocks between trades is too low!");
        require(_maxGasPrice > 0, "Max gas price is too low!");

        Order memory newOrder = Order(
            _orderId,                                   // orderId
            msg.sender,                                 // creator
            _recipient,                                 // recipient
            _srcToken,                                  // srcToken
            _destToken,                                 // destToken
            _srcQty,                                    // srcQty
            _numTradesLeft,                                 // numTradesLeft
            _minBlockInterval,                          // minBlockInterval
            block.number,                               // lastBlockNumber
            _maxGasPrice,                               // maxGasPrice
            true                                        // active
        );

        // Replace old order with newOrder in allOrders
        allOrders[_orderId] = newOrder;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Replace old order with newOrder in myOrders
        myOrders[msg.sender][index] = newOrder;

        // Log the order updated event
        emit UpdateOrder(_orderId);

        return true;
    }

    function activateOrder(uint _orderId) public onlyOrderOwner(_orderId) {
        // Activate order from allOrders
        allOrders[_orderId].active = true;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Activate order in myOrders
        myOrders[msg.sender][index].active = true;

        // Log the order activation event
        emit ActivateOrder(_orderId, msg.sender);
    }

    function deactivateOrder(uint _orderId) public onlyOrderOwner(_orderId) {
        // Deactivate order from allOrders
        allOrders[_orderId].active = false;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Deactivate order in myOrders
        myOrders[msg.sender][index].active = false;

        // Log the order deactivation event
        emit DeactivateOrder(_orderId, msg.sender);
    }

    // Create function to get average gas, need to test
    // https://ethereum.stackexchange.com/questions/48331/show-gas-used-in-solidity
    function getAverageGas() public view returns (uint) {
        return totalGasCosts.div(numTradesCompleted);
    }
    
    function calculateFees(uint _maxGasPrice) internal view returns (uint) {
        uint gasPrice;
        if(tx.gasprice >= _maxGasPrice) {
            gasPrice = _maxGasPrice;
        } else {
            gasPrice = tx.gasprice;
        }
        // Adding 10% of average gas as service fee
        return getAverageGas().add(getAverageGas().div(10)).mul(gasPrice);
    }
    
    // Fallback payable function to accept ether
    function () external payable {
        emit LogDeposit(msg.sender);
    }

    /********************************************************/
    /* KyberNetworkProxy constants, variables and functions */
    /********************************************************/

    /* Constants */
    ERC20Detailed constant internal ETH_TOKEN_ADDRESS = ERC20Detailed(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
    uint constant internal MAX_QTY = 10**28;
    address constant internal WALLET_ID = address(0);
    bytes constant constant HINT = "";

    /* Variables */
    KyberNetworkProxyInterface public kyberNetworkProxyContract; // KyberNetworkProxy contract

    /* Events */
    event Trade(
        address indexed sender,
        address indexed recipient,
        ERC20Detailed srcToken,
        ERC20Detailed destToken,
        uint srcQty,
        uint destQty,
        uint fees
    );

    event UpdateKNP(
        address indexed KyberNetworkProxyAddress
    );

    /* Functions */
    /**
     * @dev Update KyberNetworkProxy contract address
     * @param _kyberNetworkProxyContract New KyberNetwokrProxy contract address
     */
    function updateKNPAddress(
        KyberNetworkProxyInterface _kyberNetworkProxyContract
    ) public onlyAdmin {
        require(address(_kyberNetworkProxyContract) != address(0), "KyberNetworkProxy contract address cannot be the null address!");
        kyberNetworkProxyContract = _kyberNetworkProxyContract;
        emit UpdateKNP(address(kyberNetworkProxyContract));
    }

    /**
     * @dev Swap the user's ERC20 token to another ERC20 token / ETH
     * @param _creator creator of the order
     * @param _srcToken source token contract address
     * @param _srcQty amount of source tokens
     * @param _destToken destination token contract address
     * @param _destAddress address to send dca-ed tokens to
     * @param _fees fees to be deducted
     */
    function swapTokenToToken(
        address _creator,
        address payable _destAddress,
        ERC20Detailed _srcToken,
        uint _srcQty,
        ERC20Detailed _destToken,
        uint _fees
    ) internal {

        // Check that the srcToken transferFrom has succeeded
        _srcToken.safeTransferFrom(_creator, address(this), _srcQty);
        
        // Convert srcToken amount to destToken amount
        // Note that some precision might be truncated if you go from higher decimal to lower decimals
        uint srcDecimals = _srcToken.decimals();
        uint destDecimals;
        uint destQty;
        if (_destToken == ETH_TOKEN_ADDRESS) {
            destDecimals = 18;
            destQty = _srcQty.mul(destDecimals).div(srcDecimals);    // Note that some precision might be truncated if you go from higher decimal to lower decimals

            // Check that there is sufficient ETH balance in OML        
            require(address(this).balance > destQty, "Insufficient ETH in OML for transfer!");

            // Transfer ETH to destAddress
            require(_destAddress.send(destQty), "ETH transfer failed!");

        } else {
            destDecimals = _destToken.decimals();
            destQty = _srcQty.mul(destDecimals).div(srcDecimals);    // Note that some precision might be truncated if you go from higher decimal to lower decimals

            // Check that there is sufficient destToken balance in OML
            require(_destToken.balanceOf(address(this)) > destQty, "Insufficient tokens in OML for transfer!");
            
            // Transfer destToken to destAddress
            _destToken.safeTransfer(_destAddress, destQty);
        }
        
        // Log the event
        emit Trade(_creator, _destAddress, _srcToken, _destToken, _srcQty, destQty, _fees);
    }

    // /**
    //  * @dev Swap the user's ERC20 token to another ERC20 token / ETH
    //  * @param _creator creator of the order
    //  * @param _srcToken source token contract address
    //  * @param _srcQty amount of source tokens
    //  * @param _destToken destination token contract address
    //  * @param _destAddress address to send dca-ed tokens to
    //  * @param _fees fees to be deducted
    //  */
    // function swapTokenToToken(
    //     address _creator,
    //     address payable _destAddress,
    //     ERC20Detailed _srcToken,
    //     uint _srcQty,
    //     ERC20Detailed _destToken,
    //     uint _fees
    // ) internal {
    //     uint minConversionRate;
    //     uint slippageRate;
    //     uint destQty;
    //     uint ethQty;

    //     // Check that the _srcToken transferFrom has succeeded
    //     _srcToken.safeTransferFrom(_creator, address(this), _srcQty);

    //     // Mitigate ERC20 Approve front-running attack, by initially setting
    //     // allowance to 0
    //     _srcToken.safeApprove(address(kyberNetworkProxyContract), 0);

    //     // Set the spender's token allowance to _srcQty
    //     _srcToken.safeApprove(address(kyberNetworkProxyContract), _srcQty);

    //     // Get the minimum conversion rate from _srcToken to ETH 
    //     (minConversionRate, slippageRate) = kyberNetworkProxyContract.getExpectedRate(_srcToken, ETH_TOKEN_ADDRESS, _srcQty);

    //     // Swap _srcToken to ETH and send here
    //     ethQty = kyberNetworkProxyContract.tradeWithHint(
    //         _srcToken,
    //         _srcQty,
    //         ETH_TOKEN_ADDRESS,
    //         address(uint160(address(this))),
    //         MAX_QTY,
    //         slippageRate,
    //         WALLET_ID,
    //         HINT
    //     );
        
    //     // Deduct fees
    //     ethQty = ethQty.sub(_fees);
        
    //     // Check if destToken is ETH (note that I know I'm comparing ERRC20Detailed with an address...)
    //     if(_destToken == ETH_TOKEN_ADDRESS) {
            
    //         // Update destQty
    //         destQty = ethQty;
            
    //         // Send destQty to destAddress
    //         require(_destAddress.send(destQty), "Insufficient ETH to send to recipient");
    //     } else {
            
    //         // Get the minimum conversion rate from ETH to _destToken
    //         (minConversionRate, slippageRate) = kyberNetworkProxyContract.getExpectedRate(
    //             ETH_TOKEN_ADDRESS,
    //             _destToken,
    //             ethQty
    //         );
    
    //         // Swap ETH to _destToken and send to destination address
    //         destQty = kyberNetworkProxyContract.tradeWithHint.value(ethQty)(
    //             ETH_TOKEN_ADDRESS,
    //             ethQty,
    //             _destToken,
    //             _destAddress,
    //             MAX_QTY,
    //             slippageRate,
    //             WALLET_ID,
    //             HINT
    //         );
    //     }
        
    //     // Log the event
    //     emit Trade(_creator, _destAddress, _srcToken, _destToken, _srcQty, destQty, _fees);   
    // }
}
