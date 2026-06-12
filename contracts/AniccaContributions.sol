// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract AniccaContributions {
    error AmountMustBeGreaterThanZero();
    error InvalidRecipient();
    error NotOwner();
    error Reentrancy();
    error TransferFailed();

    uint256 public constant FEE_BASIS_POINTS = 300;
    uint256 public constant BASIS_POINTS = 10_000;

    event CeloContribution(
        bytes32 indexed campaignId,
        address indexed contributor,
        address indexed recipient,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformFee
    );
    event CopmContribution(
        bytes32 indexed campaignId,
        address indexed contributor,
        address indexed recipient,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformFee
    );
    event NativeDeposit(address indexed sender, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlatformTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    address public owner;
    address payable public platformTreasury;
    IERC20 public immutable copm;

    uint256 private locked;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked == 1) revert Reentrancy();
        locked = 1;
        _;
        locked = 0;
    }

    constructor(address copmAddress, address payable platformTreasuryAddress) {
        if (copmAddress == address(0)) revert InvalidRecipient();
        if (platformTreasuryAddress == address(0)) revert InvalidRecipient();

        owner = msg.sender;
        platformTreasury = platformTreasuryAddress;
        copm = IERC20(copmAddress);

        emit OwnershipTransferred(address(0), msg.sender);
        emit PlatformTreasuryUpdated(address(0), platformTreasuryAddress);
    }

    receive() external payable {
        if (msg.value == 0) revert AmountMustBeGreaterThanZero();
        emit NativeDeposit(msg.sender, msg.value);
    }

    function contributeCelo(
        bytes32 campaignId,
        address payable recipient
    ) external payable nonReentrant {
        if (msg.value == 0) revert AmountMustBeGreaterThanZero();
        if (recipient == address(0)) revert InvalidRecipient();

        (uint256 platformFee, uint256 creatorAmount) = splitAmount(msg.value);

        (bool feeSuccess, ) = platformTreasury.call{ value: platformFee }("");
        if (!feeSuccess) revert TransferFailed();

        (bool creatorSuccess, ) = recipient.call{ value: creatorAmount }("");
        if (!creatorSuccess) revert TransferFailed();

        emit CeloContribution(campaignId, msg.sender, recipient, msg.value, creatorAmount, platformFee);
    }

    function contributeCopm(
        bytes32 campaignId,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (recipient == address(0)) revert InvalidRecipient();

        (uint256 platformFee, uint256 creatorAmount) = splitAmount(amount);

        bool feeSuccess = copm.transferFrom(msg.sender, platformTreasury, platformFee);
        if (!feeSuccess) revert TransferFailed();

        bool creatorSuccess = copm.transferFrom(msg.sender, recipient, creatorAmount);
        if (!creatorSuccess) revert TransferFailed();

        emit CopmContribution(campaignId, msg.sender, recipient, amount, creatorAmount, platformFee);
    }

    function splitAmount(uint256 amount) public pure returns (uint256 platformFee, uint256 creatorAmount) {
        platformFee = (amount * FEE_BASIS_POINTS) / BASIS_POINTS;
        creatorAmount = amount - platformFee;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidRecipient();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function updatePlatformTreasury(address payable newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidRecipient();

        address previousTreasury = platformTreasury;
        platformTreasury = newTreasury;

        emit PlatformTreasuryUpdated(previousTreasury, newTreasury);
    }

    function withdrawNative(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (recipient == address(0)) revert InvalidRecipient();

        (bool success, ) = recipient.call{ value: amount }("");
        if (!success) revert TransferFailed();
    }

    function rescueToken(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (recipient == address(0)) revert InvalidRecipient();

        bool success = IERC20(token).transfer(recipient, amount);
        if (!success) revert TransferFailed();
    }
}
