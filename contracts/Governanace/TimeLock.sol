// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TimeLock is TimelockController, Ownable {
  // minDelay is how long you have to wait before executing
  // proposers is the list of addresses that can propose
  // executors is the list of addresses that can execute
   //`admin`: optional account to be granted admin role; disable with zero address  /**
  /**
   * IMPORTANT: The optional admin can aid with initial configuration of roles after deployment
   * without being subject to delay, but this role should be subsequently renounced in favor of
   * administration through timelocked proposals. Previous versions of this contract would assign
   * this admin to the deployer automatically and should be renounced as well.
   */
  constructor(
    uint256 minDelay,
    address[] memory executors,
    address admin
  ) TimelockController(minDelay, new address[](0), executors, admin) {
     // Owner gets admin and proposer roles by default
        _grantRole(TIMELOCK_ADMIN_ROLE, owner());
  }
}