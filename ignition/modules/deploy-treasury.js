const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TreasuryModule = buildModule("TreasuryModule", (m) => {
  // Deploy the Treasury contract with the TimelockController address
  const timelockAddress = "0xD101eC91B5226cA24BDcdCAac5fFc103fC2b9762"; // Your TimeLock address
  const treasury = m.contract("Treasury", [timelockAddress], {
    id: "Treasury",
  });

  return { treasury };
});

module.exports = TreasuryModule;