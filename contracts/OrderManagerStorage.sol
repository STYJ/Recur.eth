pragma solidity ^0.5.10;

import "./kyber-mock-contracts/KyberNetworkProxyInterface.sol";
import "./kyber-mock-contracts/Withdrawable.sol";
import "./openzeppelin-contracts/contracts/token/ERC20/SafeERC20.sol";
import "./openzeppelin-contracts/contracts/token/ERC20/ERC20Detailed.sol";
import "./openzeppelin-contracts/contracts/math/SafeMath.sol";

contract OrderManagerStorage is Withdrawable {
    /**********************************************************/
    /* OrderManagerStorage constants, variables and functions */
    /**********************************************************/

    /* Directives */
    using SafeERC20 for ERC20Detailed;
    using SafeMath for uint;

    /* Order struct */
    struct Order {
        uint orderId;
        address creator;
        address payable recipient;
        ERC20Detailed srcToken;
        ERC20Detailed destToken;
        uint srcQty;
        uint numTradesLeft;
        uint minBlockInterval;
        uint lastBlockNumber;
        uint maxGasPrice;
        bool active;
    }

    /* Variables */
    address public orderManagerLogic;               // Address of the OrderManagerLogic contract;
    uint public totalGasCosts = 10**6;              // Total gas used by all orders to date
    uint public numTradesCompleted = 1;             // Number of trades completed to date
    Order[] public allOrders;                       // All orders in existence
    uint public numOrdersCreated;                   // Identifier for each order (increment only)
    mapping(address => Order[]) public myOrders;    // Mapping from sender to sender's orders
    mapping(address => uint) public myOrdersCount;  // Mapping from sender to number of sender's orders
    mapping(uint => uint) public myOrdersIndex;     // Mapping from orderId to index in myOrders array
    mapping(uint => address) public orderOwner;     // Mapping from orderId to creator

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
    modifier onlyOrderManagerLogic() { // Modifier
        require(
            msg.sender == orderManagerLogic,
            "Only the OrderManagerLogic contract can update this contract!"
        );
        _;
    }

    /* Functions */
    /**
     * @dev Contract constructor
     * @param _admin Admin address for the OrderManagerStorage contract
     * @param _orderManagerLogic Address of the OrderManagerLogic contract
     */
    constructor (
        address _admin,
        address _orderManagerLogic
    ) public Withdrawable(_admin) {
        require(_admin != address(0), "Admin cannot be the null address!");
        require(_orderManagerLogic != address(0), "OrderManagerLogic contract address cannot be the null address!");
        orderManagerLogic = _orderManagerLogic;
    }

    /**
     * @dev Setter for orderManagerLogic
     * @param _orderManagerLogic Address of the new OrderManagerLogic contract
     */
    function updateOrderManagerLogic(
        address _orderManagerLogic
    ) public onlyAdmin() returns(bool) {
        // Update orderManagerLogic with new OrderManagerLogic contract
        orderManagerLogic = _orderManagerLogic;

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Increase total gast costs by _delta
     * @param _delta Amount to increase totalGasCosts by
     */
    function increaseTotalGasCosts(
        uint _delta
    ) public onlyOrderManagerLogic() returns(bool) {
        // Increase totalGasCosts
        totalGasCosts = totalGasCosts.add(_delta);

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Increase number of trades by 1
     */
    function incrementNumTradesCompleted() public onlyOrderManagerLogic() returns(bool) {
        // Increment numTradesCompleted by 1
        numTradesCompleted = numTradesCompleted.add(1);

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Create a new order
     * @param _creator Address of creator / owner of this order
     * @param _recipient Address of recipient
     * @param _srcToken Source token address
     * @param _destToken Destination token address
     * @param _srcQty Source quantity per trade
     * @param _numTradesLeft Number of trades left in order
     * @param _minBlockInterval Minimum block interval between trades
     * @param _maxGasPrice Max gas price (in wei) of a trade
     */
    function createOrder(
        address _creator,
        address payable _recipient,
        ERC20Detailed _srcToken,
        ERC20Detailed _destToken,
        uint _srcQty,
        uint _numTradesLeft,
        uint _minBlockInterval,
        uint _maxGasPrice
    ) public onlyOrderManagerLogic() returns(uint) {
        require(_creator != address(0), "Creator cannot be the null address!");
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
            orderId,
            _creator,
            _recipient,
            _srcToken,
            _destToken,
            _srcQty,
            _numTradesLeft,
            _minBlockInterval,
            block.number,
            _maxGasPrice,
            true
        );

        // Add newOrder into allOrders
        allOrders.push(newOrder);

        // Add newOrder into myOrders
        myOrders[_creator].push(newOrder);

        // Track index of newOrder in myOrders array
        myOrdersIndex[orderId] = myOrdersCount[_creator];

        // Incrementing my number of orders
        myOrdersCount[_creator] ++;

        // Tracking owner of order
        orderOwner[orderId] = _creator;

        // Incrementing number of orders
        numOrdersCreated ++;

        // Log the order creation event
        emit CreateOrder(orderId, _creator);

        // Return the orderId
        return orderId;
    }

    /**
     * @dev Decrement number of trades left for a given order
     * @param _orderId Id of order to be updated
     */
    function decrementNumTradesLeft(
        uint _orderId
    ) public onlyOrderManagerLogic() returns(bool) {
        // Decrement number of trades left by 1
        allOrders[_orderId].numTradesLeft = allOrders[_orderId].numTradesLeft.sub(1);

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Update last block number of a given order
     * @param _orderId Id of order to be updated
     */
    function updateLastBlockNumber(
        uint _orderId
    ) public onlyOrderManagerLogic() returns(bool) {
        // Update lastBlockNumber to current block nunmber
        allOrders[_orderId].lastBlockNumber = block.number;

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Update an existing order
     * @param _orderId Id of order to be updated
     * @param _creator Address of creator / owner of this order
     * @param _recipient Address of recipient
     * @param _srcToken Source token address
     * @param _destToken Destination token address
     * @param _srcQty Source quantity per trade
     * @param _numTradesLeft Number of trades left in order
     * @param _minBlockInterval Minimum block interval between trades
     * @param _maxGasPrice Max gas price (in wei) of a trade
     */
    function updateOrder(
        uint _orderId,
        address _creator,
        address payable _recipient,
        ERC20Detailed _srcToken,
        ERC20Detailed _destToken,
        uint _srcQty,
        uint _numTradesLeft,
        uint _minBlockInterval,
        uint _maxGasPrice
    ) public onlyOrderManagerLogic() returns(bool) {
        require(_creator != address(0), "Creator cannot be the null address!");
        require(_recipient != address(0), "Recipient cannot be the null address!");
        require(address(_srcToken) != address(0), "SrcToken cannot be the null address!");
        require(address(_srcToken) != address(ETH_TOKEN_ADDRESS), "SrcToken cannot be the ETH address!");
        require(address(_destToken) != address(0), "DestToken cannot be the null address!");
        require(_srcQty > 0, "SrcQty is too low!");
        require(_numTradesLeft > 0, "Number of trades left is too low!");
        require(_minBlockInterval > 0, "Min number of blocks between trades is too low!");
        require(_maxGasPrice > 0, "Max gas price is too low!");

        Order memory newOrder = Order(
            _orderId,
            _creator,
            _recipient,
            _srcToken,
            _destToken,
            _srcQty,
            _numTradesLeft,
            _minBlockInterval,
            block.number,
            _maxGasPrice,
            true
        );

        // Replace old order with newOrder in allOrders
        allOrders[_orderId] = newOrder;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Replace old order with newOrder in myOrders
        myOrders[_creator][index] = newOrder;

        // Log the order updated event
        emit UpdateOrder(_orderId);

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Activate an order
     * @param _orderId Id of order to be updated
     * @param _creator Address of creator / owner of this order
     */
    function activateOrder(
        uint _orderId,
        address _creator
    ) public onlyOrderManagerLogic() returns(bool) {
        // Activate order from allOrders
        allOrders[_orderId].active = true;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Activate order in myOrders
        myOrders[_creator][index].active = true;

        // Log the order activation event
        emit ActivateOrder(_orderId, _creator);

        // Return true to indicate successful
        return true;
    }

    /**
     * @dev Deactivate an order
     * @param _orderId Id of order to be updated
     * @param _creator Address of creator / owner of this order
     */
    function dectivateOrder(
        uint _orderId,
        address _creator
    ) public onlyOrderManagerLogic() returns(bool) {
        // Deactivate order from allOrders
        allOrders[_orderId].active = false;

        // Get index of order in myOrders
        uint index = myOrdersIndex[_orderId];

        // Deactivate order in myOrders
        myOrders[_creator][index].active = false;

        // Log the order deactivation event
        emit DeactivateOrder(_orderId, _creator);

        // Return true to indicate successful
        return true;
    }


    // Fallback payable function to accept ether
    function () external payable {
        emit LogDeposit(msg.sender);
    }

    /********************************************************/
    /* KyberNetworkProxy constants, variables and functions */
    /********************************************************/

    /* Constants */
    ERC20Detailed constant public ETH_TOKEN_ADDRESS = ERC20Detailed(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
    uint public maxQty = 10**28;
    address public walletId = address(0);
    bytes public hint = "";

    /* Variables */
    KyberNetworkProxyInterface internal kyberNetworkProxyContract; // KyberNetworkProxy contract

    /* Events */
    event UpdateKNP(
        address indexed KyberNetworkProxyAddress
    );

    /* Functions */
    /**
     * @dev Setter for kyberNetworkProxyContract
     * @param _kyberNetworkProxyContract Address of new KyberNetworkProxy contract
     */
    function setKyberNetworkProxyContract(
        KyberNetworkProxyInterface _kyberNetworkProxyContract
    ) public onlyAdmin() returns(bool) {
        kyberNetworkProxyContract = _kyberNetworkProxyContract;
        return true;
    }

    /**
     * @dev Setter for maxQty
     * @param _maxQty New max quantity to replace old max quantity
     */
    function setMaxQty(uint _maxQty) public onlyAdmin() returns(bool) {
        maxQty = _maxQty;
        return true;
    }

    /**
     * @dev Setter for walletId
     * @param _walletId Address of new walletId to replace old walletId
     */
    function setWalletId(address _walletId) public onlyAdmin() returns(bool) {
        walletId = _walletId;
        return true;
    }

    /**
     * @dev Setter for hint
     * @param _hint New hint to replace old hint
     */
    function setHint(bytes memory _hint) public onlyAdmin() returns(bool) {
        hint = _hint;
        return true;
    }

    function updateKNPAddress(
        KyberNetworkProxyInterface _kyberNetworkProxyContract
    ) public onlyAdmin {
        require(address(_kyberNetworkProxyContract) != address(0), "KyberNetworkProxy contract address cannot be the null address!");
        kyberNetworkProxyContract = _kyberNetworkProxyContract;
        emit UpdateKNP(address(kyberNetworkProxyContract));
    }
}