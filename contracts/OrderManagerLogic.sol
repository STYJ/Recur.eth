pragma solidity ^0.5.10;

import "./KyberNetworkProxyInterface.sol";
import "./SafeERC20.sol";
import "./SafeMath.sol";
import "./Withdrawable.sol";

contract OrderManagerLogic is Withdrawable {
    // Directives
    using SafeERC20 for ERC20;
    using SafeMath for uint;

    // Constants
    ERC20 constant internal ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
    uint constant internal MAX_QTY = 10**28;
    address constant internal WALLET_ID = address(0);
    bytes constant constant HINT = "";

    // Order struct
    struct Order {
        uint orderId;
        address sender;
        address receiver;
        ERC20 src;
        ERC20 dest;
        uint srcQty;
        uint frequency;
        uint numBlocks;
        uint lastBlock;
        uint maxGasPrice;
    }

    // Variables
    uint totalGasCosts; // Total gas used by all purchases to date
    uint numPurchases; // Number of purchases completed to date
    Order[] orders; // All orders in existence
    uint numOrders; // Identifier for each order (increment only)
    mapping(address => Order[]) myOrders; // Orders where msg.sender is sender
    mapping(address => uint256) myOrdersCount; // Number of orders belonging to msg.sender
    mapping(uint256 => uint256) myOrdersIndex; // Mapping from orderId to index in myOrders array
    mapping(uint256 => address) orderOwner; // Mapping from orderId to sender
    mapping(address => uint256) gasBalances; // Mapping from sender to gasBalance (shared balance between all orders)
    KyberNetworkProxyInterface public kyberNetworkProxyContract; // KyberNetworkProxy contract


    // Events
    event Swap(
        address indexed sender,
        address indexed recipient,
        ERC20 srcToken,
        ERC20 destToken,
        uint srcQty,
        uint destQty
    );

    // Functions
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

    /**
     * @dev Swap the user's ERC20 token to another ERC20 token / ETH
     * @param _srcToken source token contract address
     * @param _srcQty amount of source tokens
     * @param _destToken destination token contract address
     * @param _destAddress address to send swapped tokens to
     */
    function swapTokenToToken(
        ERC20 _srcToken,
        uint _srcQty,
        ERC20 _destToken,
        address payable _destAddress
    ) public {
        uint minConversionRate;
        uint destQty;

        // Check that the token transferFrom has succeeded
        _srcToken.safeTransferFrom(msg.sender, address(this), _srcQty);

        // Mitigate ERC20 Approve front-running attack, by initially setting
        // allowance to 0
        _srcToken.safeApprove(address(kyberNetworkProxyContract), 0);

        // Set the spender's token allowance to tokenQty
        _srcToken.safeApprove(address(kyberNetworkProxyContract), _srcQty);

        // Get the minimum conversion rate
        (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(
            _srcToken,
            _destToken,
            _srcQty
        );

        // Swap the ERC20 token to ERC20 token / ETH and send to destAddress
        destQty = kyberNetworkProxyContract.tradeWithHint(
            _srcToken,
            _srcQty,
            _destToken,
            _destAddress,
            MAX_QTY,
            minConversionRate,
            WALLET_ID,
            HINT
        );

        // Log the event
        emit Swap(msg.sender, _destAddress, _srcToken, _destToken, _srcQty, destQty);
    }

    /**
     * @dev Swap the user's ETH to ERC20 token
     * @param _destToken destination token contract address
     * @param _destAddress address to send swapped tokens to
     */
    function swapEthToToken(
        ERC20 _destToken,
        address payable _destAddress
    ) public payable {
        uint minConversionRate;
        uint destQty;

        // Get the minimum conversion rate
        (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(
            ETH_TOKEN_ADDRESS,
            _destToken,
            msg.value
        );

        // Swap the ETH to ERC20 token and send to destination address
        destQty = kyberNetworkProxyContract.tradeWithHint.value(msg.value)(
            ETH_TOKEN_ADDRESS,
            msg.value,
            _destToken,
            _destAddress,
            MAX_QTY,
            minConversionRate,
            WALLET_ID,
            HINT
        );

        // Log the event
        emit Swap(msg.sender, _destAddress, ETH_TOKEN_ADDRESS, _destToken, msg.value, destQty);
    }

    /**
     * @dev Swap the user's ERC20 token to ETH
     * @param _srcToken source token contract address
     * @param _srcQty amount of source tokens
     * @param _destAddress address to send swapped ETH to
     */
    function swapTokenToEth(
        ERC20 _srcToken,
        uint _srcQty,
        address payable _destAddress
    ) public {
        uint minConversionRate;
        uint destQty;

        // Check that the token transferFrom has succeeded
        _srcToken.safeTransferFrom(msg.sender, address(this), _srcQty);

        // Mitigate ERC20 Approve front-running attack, by initially setting
        // allowance to 0
        _srcToken.safeApprove(address(kyberNetworkProxyContract), 0);

        // Set the spender's token allowance to tokenQty
        _srcToken.safeApprove(address(kyberNetworkProxyContract), _srcQty);

        // Get the minimum conversion rate
        (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(_srcToken, ETH_TOKEN_ADDRESS, _srcQty);

        // Swap the ERC20 token to ETH and send to destination address
        destQty = kyberNetworkProxyContract.tradeWithHint(
            _srcToken,
            _srcQty,
            ETH_TOKEN_ADDRESS,
            _destAddress,
            MAX_QTY,
            minConversionRate,
            WALLET_ID,
            HINT
        );

        // Log the event
        emit Swap(msg.sender, _destAddress, _srcToken, ETH_TOKEN_ADDRESS, _srcQty, destQty);
    }


}
