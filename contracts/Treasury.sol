// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Treasury is Pausable, AccessControl {
    bytes32 public constant TREASURY_EXECUTOR_ROLE = keccak256("TREASURY_EXECUTOR_ROLE");
    event TokensTransferred(address token, address to, uint256 amount);
    event PolTransferred(address to, uint256 amount);

    constructor(address timelockController) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // Deployer as admin
        _grantRole(TREASURY_EXECUTOR_ROLE, timelockController); // Timelock as executor
    }

    /**
     * @dev Transfers ERC-20 tokens from the treasury. Only callable by authorized roles.
     * @param token The address of the ERC-20 token contract.
     * @param to The recipient address.
     * @param amount The amount of tokens to transfer.
     */
    function transferTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(TREASURY_EXECUTOR_ROLE) whenNotPaused {
        require(token != address(0), "Invalid token address");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        IERC20 tokenContract = IERC20(token);
        uint256 treasuryBalance = tokenContract.balanceOf(address(this));
        require(treasuryBalance >= amount, "Insufficient token balance");

        bool success = tokenContract.transfer(to, amount);
        require(success, "Token transfer failed");
        emit TokensTransferred(token, to, amount);
    }

    /**
     * @dev Transfers native POL from the treasury. Only callable by authorized roles.
     * @param to The recipient address.
     * @param amount The amount of POL to transfer (in wei).
     */
    function transferPol(address to, uint256 amount) external onlyRole(TREASURY_EXECUTOR_ROLE) whenNotPaused {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");

        (bool sent, ) = to.call{value: amount}("");
        require(sent, "Failed to send Ether");
        emit PolTransferred(to, amount);
    }

    /**
     * @dev Pauses the treasury operations. Only callable by admin.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the treasury operations. Only callable by admin.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Allows the treasury to receive POL (or ETH).
     */
    receive() external payable {}

    /**
     * @dev Allows the treasury to receive POL (or ETH) via `send` or `transfer`.
     */
    fallback() external payable {}

    /**
     * @dev Grants the TREASURY_EXECUTOR_ROLE to a new address (e.g., Governor or Timelock). Only callable by admin.
     */
    function grantExecutorRole(address executor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TREASURY_EXECUTOR_ROLE, executor);
    }

    /**
     * @dev Returns the balance of a specific ERC-20 token held by the treasury.
     * @param token The address of the ERC-20 token contract.
     * @return The token balance in wei.
     */
    function tokenBalance(address token) external view returns (uint256) {
        require(token != address(0), "Invalid token address");
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Returns the native POL balance held by the treasury.
     * @return The POL balance in wei.
     */
    function polBalance() external view returns (uint256) {
        return address(this).balance;
    }
}