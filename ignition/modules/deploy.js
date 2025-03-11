const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DAODeployment", (m) => {
  // Deploy Governance Token
  const governanceToken = m.contract("GovernanceToken");

  // Deploy TimeLock with modified constructor
  const minDelay = 300; // 5 minutes in seconds
  const executors = []; // Initially empty, can be added later
  const admin = "0xe8239aFA5Cc7Ec80d27713A60D2E50facbeA3BC0"; // Initial admin/owner

  console.log("Deploying TimeLock with parameters:", minDelay, executors, admin);

  const timelock = m.contract("TimeLock", [
    minDelay,
    executors,
    admin
  ]);

  // Deploy Governor Contract
  const governor = m.contract("GovernorContract", [
    governanceToken,
    timelock,
    4,       // quorumPercentage
    450,     // votingPeriod
    150      // votingDelay
  ]);

  // Deploy Box contract (assuming this is a governance target contract)
  const box = m.contract("Box");

  // Set up roles and ownership
  const proposerRole = m.staticCall(timelock, "PROPOSER_ROLE");
  const executorRole = m.staticCall(timelock, "EXECUTOR_ROLE");
  const adminRole = m.staticCall(timelock, "TIMELOCK_ADMIN_ROLE");

  // Grant proposer role to the governor contract
  const grantProposerRole = m.call(
    timelock,
    "grantRole",
    [proposerRole, governor],
    { id: "grant_proposer_role" }
  );

  // Optional: Grant executor role to zero address or specific addresses
  const grantExecutorRole = m.call(
    timelock,
    "grantRole",
    [executorRole, "0x0000000000000000000000000000000000000000"],
    { id: "grant_executor_role" }
  );

  // Transfer ownership of Box to TimeLock
  const transferOwnership = m.call(
    box,
    "transferOwnership",
    [timelock],
    { id: "transfer_box_ownership" }
  );

  // Revoke admin role from initial admin (optional but recommended)
  const revokeAdminRole = m.call(
    timelock,
    "revokeRole",
    [adminRole, admin],
    { id: "revoke_admin_role" }
  );

  // Return all the contract instances and transactions
  return {
    governanceToken,
    timelock,
    governor,
    box,
    grantProposerRole,
    grantExecutorRole,
    transferOwnership,
    revokeAdminRole
  };
});