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
        uint maxGasPrice;                               // Max gas price of a trade
        bool active;                                    // If order is still active
    }

    /* Variables */
    uint internal totalGasCosts;                        // Total gas used by all orders to date
    uint internal numTradesCompleted;                   // Number of trades completed to date
    Order[] public allOrders;                           // All orders in existence
    uint public numOrdersCreated;                       // Identifier for each order (increment only)
    mapping(address => Order[]) public myOrders;        // Mapping from sender to sender's orders
    mapping(address => uint256) public myOrdersCount;   // Mapping from sender to number of sender's orders
    mapping(uint256 => uint256) public myOrdersIndex;   // Mapping from orderId to index in myOrders array
    mapping(uint256 => address) public orderOwner;      // Mapping from orderId to sender
    mapping(address => uint256) public gasBalances;     // Mapping from sender to gasBalance (shared balance between all orders)

    /* Events */
    event OrderCreated(
        uint indexed orderId,
        address indexed sender
    );

    event OrderUpdated(uint indexed orderId);

    event OrderReactivated(
        uint indexed orderId,
        address indexed sender
    );

    event OrderDeactivated(
        uint indexed orderId,
        address indexed sender
    );

    event OrderTaken(
        uint indexed orderId,
        address indexed sender
    );

    /* Modifiers */
    modifier onlyOrderOwner(uint orderId) { // Modifier
        require(
            msg.sender == orderOwner[orderId],
            "Only owner of the order can call this."
        );
        _;
    }


    /* Functions */
    /**
     * @dev Contract constructor
     * @param _kyberNetworkProxyContract KyberNetworkProxy contract address
     * @param _admin Admin address for the contract
     */
    constructor (
        KyberNetworkProxyInterface _kyberNetworkProxyContract,
        address _admin
    ) public Withdrawable(_admin) {
        require(_admin != address(0));
        require(address(_kyberNetworkProxyContract) != address(0));
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
        require(_recipient != address(0), "Recipient cannot be the null address");
        require(address(_srcToken) != address(0), "SrcToken cannot be the null address");
        require(address(_destToken) != address(0), "Dest  cannot be the null address");
        require(_srcQty > 0, "SrcQty is too low.");
        require(_numTradesLeft > 0, "Number of trades left is too low.");
        require(_minBlockInterval > 0, "Min number of blocks between trades is too low.");
        require(_maxGasPrice > 0, "Max gas price is too low.");

        Order memory newOrder = Order(
            numOrdersCreated,                           // orderId
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
        myOrdersIndex[numOrdersCreated] = myOrdersCount[msg.sender];

        // Incrementing my number of orders
        myOrdersCount[msg.sender] ++;

        // Tracking owner of order
        orderOwner[numOrdersCreated] = msg.sender;

        // Incrementing number of orders
        numOrdersCreated ++;

        // Need to also add any msg.value as gas balance.


        // Log the order creation event
        emit OrderCreated(numOrdersCreated.sub(1), msg.sender);

        // Return the orderId
        return numOrdersCreated.sub(1);
    }

    function triggerTrade(uint _orderId) public {
        // Check that order is still active
        Order memory order = allOrders[_orderId];
        require(order.active, "Order is inactive.");

        // Check that allowance is sufficient
        require(order.srcToken.allowance(
            order.creator, address(this)) > order.srcQty,
            "Insufficient token allowance"
        );

        // Check min block interval has passed
        require(
            order.lastBlockNumber.add(order.minBlockInterval) < block.number,
            "Min block interval has not passed"
        );

        // Check that numTradesLeft is more than 0
        require(
            order.numTradesLeft > 0,
            "Order numTradesLeft needs to be greater than 0"
        );

        // Check that there's sufficient gas balance and transfer gas to me

        // Reduce numTradesLeft n stuff

        // Check user balance and execute trade the trade?


        if(order.srcToken != ETH_TOKEN_ADDRESS && order.destToken != ETH_TOKEN_ADDRESS) {
            swapTokenToToken(order.creator, order.recipient, order.srcToken, order.srcQty, order.destToken);
        } else if(order.srcToken != ETH_TOKEN_ADDRESS && order.destToken == ETH_TOKEN_ADDRESS) {
            swapTokenToEth(order.creator, order.recipient, order.srcToken, order.srcQty);
        } else if(order.srcToken == ETH_TOKEN_ADDRESS && order.destToken != ETH_TOKEN_ADDRESS) {
            revert("srcToken is ETH but ETH is not ERC20!");
        } else {
            // Shouldn't be able to reach here
            revert("srcToken and destToken are both ETH!");
        }
        
        // // Normally you'd do an action here but for this, I will just try to transfer some tokens
        // order.srcToken.safeTransferFrom(order.creator, address(this), order.srcQty);


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
    ) public onlyOrderOwner(_orderId) {
        require(_recipient != address(0), "Recipient cannot be the null address");
        require(address(_srcToken) != address(0), "SrcToken cannot be the null address");
        require(address(_destToken) != address(0), "Dest  cannot be the null address");
        require(_srcQty > 0, "SrcQty is too low.");
        require(_numTradesLeft > 0, "Number of trades left is too low.");
        require(_minBlockInterval > 0, "Min number of blocks between trades is too low.");
        require(_maxGasPrice > 0, "Max gas price is too low.");

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
        emit OrderUpdated(_orderId);
    }

    function reactivateOrder(uint _orderId) public onlyOrderOwner(_orderId) {
        // Reactivate order from allOrders
        allOrders[_orderId].active = true;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Reactivate order in myOrders
        myOrders[msg.sender][index].active = true;

        // Log the order reactivation event
        emit OrderReactivated(_orderId, msg.sender);
    }

    function deactivateOrder(uint _orderId) public onlyOrderOwner(_orderId) {
        // Deactivate order from allOrders
        allOrders[_orderId].active = false;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Deactivate order in myOrders
        myOrders[msg.sender][index].active = false;

        // Log the order deactivation event
        emit OrderDeactivated(_orderId, msg.sender);
    }

    // Create a function to add gas

    // Create function to calculate average gas
    // https://ethereum.stackexchange.com/questions/48331/show-gas-used-in-solidity

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
        uint destQty
    );

    /* Functions */
    /**
     * @dev Swap the user's ERC20 token to another ERC20 token / ETH
     * @param _creator creator of the order
     * @param _srcToken source token contract address
     * @param _srcQty amount of source tokens
     * @param _destToken destination token contract address
     * @param _destAddress address to send dca-ed tokens to
     */
    //  Todo: Break token to token swap into Token -> ETH -> Token so you can deduct fees.
    function swapTokenToToken(
        address _creator,
        address payable _destAddress,
        ERC20Detailed _srcToken,
        uint _srcQty,
        ERC20Detailed _destToken
    ) internal {

        // Check that the srcToken transferFrom has succeeded
        _srcToken.safeTransferFrom(_creator, address(this), _srcQty);
        
        // Convert srcToken amount to destToken amount
        // Note that some precision might be truncated if you go from higher decimal to lower decimals
        uint srcDecimals = _srcToken.decimals();
        uint destDecimals = _destToken.decimals();
        uint destQty = _srcQty.mul(destDecimals).div(srcDecimals);    // Note that some precision might be truncated if you go from higher decimal to lower decimals
        
        // Check that there is sufficient destToken balance in OML
        require(_destToken.balanceOf(address(this)) > destQty, "Insufficient tokens in OML for transfer");
        
        // Transfer destToken to destAddress
        _destToken.safeTransfer(_destAddress, destQty);

        // Log the event
        emit Trade(_creator, _destAddress, _srcToken, _destToken, _srcQty, destQty);
    }

    /**
     * @dev Swap the user's ERC20 token to ETH
     * @param _creator creator of the order
     * @param _srcToken source token contract address
     * @param _srcQty amount of source tokens
     * @param _destAddress address to send dca-ed ETH to
     */
    //  Todo: Deduct fees before you send eth back.
    function swapTokenToEth(
        address _creator,
        address payable _destAddress,
        ERC20Detailed _srcToken,
        uint _srcQty
    ) internal {
        // Check that the srcToken transferFrom has succeeded
        _srcToken.safeTransferFrom(_creator, address(this), _srcQty);
        
        // Convert srcToken amount to ETH amount
        // Note that some precision might be truncated if you go from higher decimal to lower decimals
        uint srcDecimals = _srcToken.decimals();
        uint ethDecimals = 18;
        uint destQty = _srcQty.mul(ethDecimals).div(srcDecimals);    // Note that some precision might be truncated if you go from higher decimal to lower decimals
        
        // Check that there is sufficient ETH balance in OML        
        require(address(this).balance > destQty, "Insufficient ETH in OML for transfer");

        // Transfer ETH to destAddress
        require(_destAddress.send(destQty), "ETH transfer failed");

        // Log the event
        emit Trade(_creator, _destAddress, _srcToken, ETH_TOKEN_ADDRESS, _srcQty, destQty);
    }

    // /**
    //  * @dev Swap the user's ERC20 token to another ERC20 token / ETH
    //  * @param _creator creator of the order
    //  * @param _srcToken source token contract address
    //  * @param _srcQty amount of source tokens
    //  * @param _destToken destination token contract address
    //  * @param _destAddress address to send dca-ed tokens to
    //  */
    // function swapTokenToToken(
    //     address _creator,
    //     address payable _destAddress,
    //     ERC20Detailed _srcToken,
    //     uint _srcQty,
    //     ERC20Detailed _destToken
    // ) public {
    //     uint minConversionRate;
    //     uint destQty;

    //     // Check that the token transferFrom has succeeded
    //     _srcToken.safeTransferFrom(msg.sender, address(this), _srcQty);

    //     // Mitigate ERC20 Approve front-running attack, by initially setting
    //     // allowance to 0
    //     _srcToken.safeApprove(address(kyberNetworkProxyContract), 0);

    //     // Set the spender's token allowance to tokenQty
    //     _srcToken.safeApprove(address(kyberNetworkProxyContract), _srcQty);

    //     // Get the minimum conversion rate
    //     (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(
    //         _srcToken,
    //         _destToken,
    //         _srcQty
    //     );

    //     // Swap the ERC20 token to ERC20 token / ETH and send to destAddress
    //     destQty = kyberNetworkProxyContract.tradeWithHint(
    //         _srcToken,
    //         _srcQty,
    //         _destToken,
    //         _destAddress,
    //         MAX_QTY,
    //         minConversionRate,
    //         WALLET_ID,
    //         HINT
    //     );

    //     // Log the event
    //     emit Trade(_creator, _destAddress, _srcToken, _destToken, _srcQty, destQty);
    // }

    // /**
    //  * @dev Swap the user's ETH to ERC20 token
    //  * @param _creator creator of the order
    //  * @param _destToken destination token contract address
    //  * @param _destAddress address to send dca-ed tokens to
    //  */
    // function swapEthToToken(
    //     address _creator,
    //     address payable _destAddress,
    //     ERC20Detailed _destToken
    // ) public payable {
    //     require(msg.value != 0, "Transaction has no Eth");
    //     uint minConversionRate;
    //     uint destQty;

    //     // Get the minimum conversion rate
    //     (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(
    //         ETH_TOKEN_ADDRESS,
    //         _destToken,
    //         msg.value
    //     );

    //     // Swap the ETH to ERC20 token and send to destination address
    //     destQty = kyberNetworkProxyContract.tradeWithHint.value(msg.value)(
    //         ETH_TOKEN_ADDRESS,
    //         msg.value,
    //         _destToken,
    //         _destAddress,
    //         MAX_QTY,
    //         minConversionRate,
    //         WALLET_ID,
    //         HINT
    //     );

    //     // Log the event
    //     emit Trade(_creator, _destAddress, ETH_TOKEN_ADDRESS, _destToken, msg.value, destQty);
    // }

    // /**
    //  * @dev Swap the user's ERC20 token to ETH
    //  * @param _creator creator of the order
    //  * @param _srcToken source token contract address
    //  * @param _srcQty amount of source tokens
    //  * @param _destAddress address to send dca-ed ETH to
    //  */
    // function swapTokenToEth(
    //     address _creator,
    //     address payable _destAddress,
    //     ERC20Detailed _srcToken,
    //     uint _srcQty
    // ) public {
    //     uint minConversionRate;
    //     uint destQty;

    //     // Check that the token transferFrom has succeeded
    //     _srcToken.safeTransferFrom(msg.sender, address(this), _srcQty);

    //     // Mitigate ERC20 Approve front-running attack, by initially setting
    //     // allowance to 0
    //     _srcToken.safeApprove(address(kyberNetworkProxyContract), 0);

    //     // Set the spender's token allowance to tokenQty
    //     _srcToken.safeApprove(address(kyberNetworkProxyContract), _srcQty);

    //     // Get the minimum conversion rate
    //     (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(_srcToken, ETH_TOKEN_ADDRESS, _srcQty);

    //     // Swap the ERC20 token to ETH and send to destination address
    //     destQty = kyberNetworkProxyContract.tradeWithHint(
    //         _srcToken,
    //         _srcQty,
    //         ETH_TOKEN_ADDRESS,
    //         _destAddress,
    //         MAX_QTY,
    //         minConversionRate,
    //         WALLET_ID,
    //         HINT
    //     );

    //     // Log the event
    //     emit Trade(_creator, _destAddress, _srcToken, ETH_TOKEN_ADDRESS, _srcQty, destQty);
    // }


}
