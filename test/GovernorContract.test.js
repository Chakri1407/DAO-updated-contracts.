const { ethers } = require("hardhat");
const { expect } = require("chai");
const { mine, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GovernorContract", function () {
  let governorContract;
  let tokenContract;
  let timelock;
  let owner;
  let addr1;
  let addr2;

  // Governance parameters
  const VOTING_DELAY = 1; // 1 block
  const VOTING_PERIOD = 50400; // About 1 week
  const QUORUM_PERCENTAGE = 4; // 4%
  const MIN_DELAY = 3600; // 1 hour

  async function deployContracts() {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Token
    const Token = await ethers.getContractFactory("GovernanceToken");
    tokenContract = await Token.deploy();
    await tokenContract.waitForDeployment();

    // Deploy Timelock
    const Timelock = await ethers.getContractFactory("TimeLock");
    timelock = await Timelock.deploy(
      MIN_DELAY,
      [], // Empty proposers array - governor will be added later
      [], // Empty executors array - governor will be added later
      owner.address
    );
    await timelock.waitForDeployment();

    // Deploy Governor
    const Governor = await ethers.getContractFactory("GovernorContract");
    governorContract = await Governor.deploy(
      await tokenContract.getAddress(),
      await timelock.getAddress(),
      QUORUM_PERCENTAGE,
      VOTING_PERIOD,
      VOTING_DELAY
    );
    await governorContract.waitForDeployment();

    // Setup roles
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();

    await timelock.grantRole(proposerRole, await governorContract.getAddress());
    await timelock.grantRole(executorRole, ethers.ZeroAddress); // Allow anyone to execute
    await timelock.revokeRole(adminRole, owner.address); // Revoke admin role after setup

    // Transfer tokens and delegate
    const transferAmount = ethers.parseEther("100");
    await tokenContract.transfer(addr1.address, transferAmount);
    await tokenContract.delegate(owner.address); // Owner delegates to self
    await tokenContract.connect(addr1).delegate(addr1.address); // addr1 delegates to self
  }

  beforeEach(async function () {
    await deployContracts();
  });

  describe("Initialization", function () {
    it("Should set the correct voting delay", async function () {
      expect(await governorContract.votingDelay()).to.equal(VOTING_DELAY);
    });

    it("Should set the correct voting period", async function () {
      expect(await governorContract.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("Should set the correct quorum percentage", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const supply = await tokenContract.totalSupply();
      const expectedQuorum = (supply * BigInt(QUORUM_PERCENTAGE)) / BigInt(100);
      expect(await governorContract.quorum(blockNumber - 1)).to.equal(
        expectedQuorum
      );
    });
  });

  describe("Proposal Lifecycle", function () {
    let proposalId;
    const proposalDescription = "Proposal #1: Store 1 in the box";
    let encodedFunction;
    let box;

    beforeEach(async function () {
      // Deploy Box
      const Box = await ethers.getContractFactory("Box");
      box = await Box.deploy();
      await box.waitForDeployment();

      // Transfer ownership to timelock
      await box.transferOwnership(await timelock.getAddress());

      // Create proposal
      encodedFunction = box.interface.encodeFunctionData("store", [1]);
      const proposeTx = await governorContract.propose(
        [await box.getAddress()],
        [0],
        [encodedFunction],
        proposalDescription
      );

      const receipt = await proposeTx.wait();
      const event = receipt.logs.find(
        (event) => event.fragment && event.fragment.name === "ProposalCreated"
      );
      proposalId = event.args[0];

      // Move past voting delay
      await mine(VOTING_DELAY + 1);
    });

    it("Should create a proposal", async function () {
      expect(await governorContract.state(proposalId)).to.equal(1); // Active
    });

    it("Should accept votes", async function () {
      const voteTx = await governorContract
        .connect(addr1)
        .castVote(proposalId, 1);
      const receipt = await voteTx.wait();

      const event = receipt.logs.find(
        (event) => event.fragment && event.fragment.name === "VoteCast"
      );
      expect(event.args.weight).to.equal(ethers.parseEther("100"));
    });

    it("Should execute successful proposals", async function () {
      // Vote from both owner and addr1 to ensure quorum
      await governorContract.castVote(proposalId, 1);
      await governorContract.connect(addr1).castVote(proposalId, 1);

      // Wait for voting period to end
      await mine(VOTING_PERIOD);

      // Queue
      const descriptionHash = ethers.id(proposalDescription);
      await governorContract.queue(
        [await box.getAddress()],
        [0],
        [encodedFunction],
        descriptionHash
      );

      // Wait for timelock
      await time.increase(MIN_DELAY + 1);

      // Execute
      await governorContract.execute(
        [await box.getAddress()],
        [0],
        [encodedFunction],
        descriptionHash
      );

      expect(await governorContract.state(proposalId)).to.equal(7); // Executed
      expect(await box.retrieve()).to.equal(1);
    });

    it("Should reject proposals that don't meet quorum", async function () {
      // Only addr2 votes (has no tokens)
      await governorContract.connect(addr2).castVote(proposalId, 1);

      await mine(VOTING_PERIOD);

      expect(await governorContract.state(proposalId)).to.equal(3); // Defeated
    });
  });

  describe("Advanced Features", function () {
    it("Should allow proposal cancellation", async function () {
      const proposalDescription = "Proposal to be cancelled";
      const proposeTx = await governorContract.propose(
        [addr1.address],
        [0],
        ["0x"],
        proposalDescription
      );

      const receipt = await proposeTx.wait();
      const event = receipt.logs.find(
        (event) => event.fragment && event.fragment.name === "ProposalCreated"
      );
      const proposalId = event.args[0];

      // Cancel immediately (before voting delay)
      const descriptionHash = ethers.id(proposalDescription);
      await governorContract.cancel(
        [addr1.address],
        [0],
        ["0x"],
        descriptionHash
      );

      expect(await governorContract.state(proposalId)).to.equal(2); // Canceled
    });
  });
});
