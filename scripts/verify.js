const hre = require("hardhat");

async function main() {
  const TIMELOCK_ADDRESS = "0xD101eC91B5226cA24BDcdCAac5fFc103fC2b9762";
  const MIN_DELAY = 300;
  const EXECUTORS = []; // Empty array
  const ADMIN = "0xe8239aFA5Cc7Ec80d27713A60D2E50facbeA3BC0";

  console.log("Verifying TimeLock contract...");
  console.log("Constructor arguments:", MIN_DELAY, EXECUTORS, ADMIN);

  try {
    await hre.run("verify:verify", {
      address: TIMELOCK_ADDRESS,
      contract: "contracts/Governanace/TimeLock.sol:TimeLock", // Adjust path if needed
      constructorArguments: [
        MIN_DELAY,
        EXECUTORS,
        ADMIN,
      ],
    });
    console.log("Verification successful!");
  } catch (error) {
    console.error("Detailed Verification Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });