const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TimeLock", function () {
  const MIN_DELAY = 3600; // 1 hour in seconds

  async function deployTimeLockFixture() {
    const [owner, proposer, executor, admin, randomUser] = await ethers.getSigners();
    
    // Arrays for constructor
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const TimeLock = await ethers.getContractFactory("TimeLock");
    const timeLock = await TimeLock.deploy(
      MIN_DELAY,
      proposers,
      executors,
      admin.address
    );

    return { timeLock, owner, proposer, executor, admin, randomUser };
  }

  describe("Deployment", function () {
    it("Should set the correct min delay", async function () {
      const { timeLock } = await loadFixture(deployTimeLockFixture);
      expect(await timeLock.getMinDelay()).to.equal(MIN_DELAY);
    });

    it("Should set the correct admin", async function () {
      const { timeLock, admin } = await loadFixture(deployTimeLockFixture);
      const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE();
      expect(await timeLock.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should set the correct proposer", async function () {
      const { timeLock, proposer } = await loadFixture(deployTimeLockFixture);
      const proposerRole = await timeLock.PROPOSER_ROLE();
      expect(await timeLock.hasRole(proposerRole, proposer.address)).to.be.true;
    });

    it("Should set the correct executor", async function () {
      const { timeLock, executor } = await loadFixture(deployTimeLockFixture);
      const executorRole = await timeLock.EXECUTOR_ROLE();
      expect(await timeLock.hasRole(executorRole, executor.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant proposer role", async function () {
      const { timeLock, admin, randomUser } = await loadFixture(deployTimeLockFixture);
      const proposerRole = await timeLock.PROPOSER_ROLE();
      
      await timeLock.connect(admin).grantRole(proposerRole, randomUser.address);
      expect(await timeLock.hasRole(proposerRole, randomUser.address)).to.be.true;
    });

    it("Should allow admin to grant executor role", async function () {
      const { timeLock, admin, randomUser } = await loadFixture(deployTimeLockFixture);
      const executorRole = await timeLock.EXECUTOR_ROLE();
      
      await timeLock.connect(admin).grantRole(executorRole, randomUser.address);
      expect(await timeLock.hasRole(executorRole, randomUser.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      const { timeLock, randomUser } = await loadFixture(deployTimeLockFixture);
      const proposerRole = await timeLock.PROPOSER_ROLE();
      
      await expect(
        timeLock.connect(randomUser).grantRole(proposerRole, randomUser.address)
      ).to.be.reverted;
    });
  });

  describe("Operation Scheduling", function () {
    it("Should allow proposer to schedule an operation", async function () {
      const { timeLock, proposer } = await loadFixture(deployTimeLockFixture);
      
      const target = ethers.Wallet.createRandom().address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.ZeroHash;
      
      const tx = await timeLock.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        MIN_DELAY
      );

      // Get operation hash
      const operationId = await timeLock.hashOperation(
        target,
        value,
        data,
        predecessor,
        salt
      );

      // Verify operation is scheduled
      expect(await timeLock.isOperationPending(operationId)).to.be.true;
    });

    it("Should not allow non-proposer to schedule operations", async function () {
      const { timeLock, randomUser } = await loadFixture(deployTimeLockFixture);
      
      const target = ethers.Wallet.createRandom().address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.ZeroHash;
      
      await expect(
        timeLock.connect(randomUser).schedule(
          target,
          value,
          data,
          predecessor,
          salt,
          MIN_DELAY
        )
      ).to.be.reverted;
    });

    it("Should not allow scheduling with delay less than minimum", async function () {
      const { timeLock, proposer } = await loadFixture(deployTimeLockFixture);
      
      const target = ethers.Wallet.createRandom().address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.ZeroHash;
      
      await expect(
        timeLock.connect(proposer).schedule(
          target,
          value,
          data,
          predecessor,
          salt,
          MIN_DELAY - 1 // Less than minimum delay
        )
      ).to.be.revertedWith("TimelockController: insufficient delay");
    });
  });

  describe("Operation Execution", function () {
    it("Should allow executor to execute after delay", async function () {
      const { timeLock, proposer, executor } = await loadFixture(deployTimeLockFixture);
      
      const target = ethers.Wallet.createRandom().address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.ZeroHash;
      
      // Schedule operation
      await timeLock.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        MIN_DELAY
      );

      // Increase time to pass delay
      await ethers.provider.send("evm_increaseTime", [MIN_DELAY]);
      await ethers.provider.send("evm_mine");

      // Execute operation
      await expect(
        timeLock.connect(executor).execute(
          target,
          value,
          data,
          predecessor,
          salt
        )
      ).to.not.be.reverted;
    });

    it("Should not allow execution before delay", async function () {
      const { timeLock, proposer, executor } = await loadFixture(deployTimeLockFixture);
      
      const target = ethers.Wallet.createRandom().address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.ZeroHash;
      
      // Schedule operation
      await timeLock.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        MIN_DELAY
      );

      // Try to execute immediately
      await expect(
        timeLock.connect(executor).execute(
          target,
          value,
          data,
          predecessor,
          salt
        )
      ).to.be.revertedWith("TimelockController: operation is not ready");
    });

    it("Should not allow non-executor to execute", async function () {
      const { timeLock, proposer, randomUser } = await loadFixture(deployTimeLockFixture);
      
      const target = ethers.Wallet.createRandom().address;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.ZeroHash;
      
      // Schedule operation
      await timeLock.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        MIN_DELAY
      );

      // Increase time
      await ethers.provider.send("evm_increaseTime", [MIN_DELAY]);
      await ethers.provider.send("evm_mine");

      // Try to execute with non-executor
      await expect(
        timeLock.connect(randomUser).execute(
          target,
          value,
          data,
          predecessor,
          salt
        )
      ).to.be.reverted;
    });
  });
});