const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("GovernanceToken", function () {
  async function deployGovernanceTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const governanceToken = await GovernanceToken.deploy();
    return { governanceToken, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { governanceToken } = await loadFixture(deployGovernanceTokenFixture);
      expect(await governanceToken.name()).to.equal("GovernanceToken");
      expect(await governanceToken.symbol()).to.equal("GTK");
    });

    it("Should mint the total supply to the owner", async function () {
      const { governanceToken, owner } = await loadFixture(deployGovernanceTokenFixture);
      const maxSupply = ethers.parseEther("1000000");
      expect(await governanceToken.balanceOf(owner.address)).to.equal(maxSupply);
    });

    it("Should set the max supply correctly", async function () {
      const { governanceToken } = await loadFixture(deployGovernanceTokenFixture);
      const maxSupply = ethers.parseEther("1000000");
      expect(await governanceToken.s_maxSupply()).to.equal(maxSupply);
    });
  });

  describe("Voting Power", function () {
    it("Should allow delegation of voting power", async function () {
      const { governanceToken, owner, addr1 } = await loadFixture(deployGovernanceTokenFixture);
      await governanceToken.delegate(addr1.address);
      expect(await governanceToken.delegates(owner.address)).to.equal(addr1.address);
    });

    it("Should update voting power after transfer", async function () {
      const { governanceToken, owner, addr1 } = await loadFixture(deployGovernanceTokenFixture);
      const transferAmount = ethers.parseEther("1000");
      
      // First delegate to self
      await governanceToken.delegate(owner.address);
      await governanceToken.transfer(addr1.address, transferAmount);
      
      // addr1 delegates to self
      await governanceToken.connect(addr1).delegate(addr1.address);
      
      expect(await governanceToken.getVotes(addr1.address)).to.equal(transferAmount);
    });

    it("Should track voting power historically", async function () {
      const { governanceToken, owner, addr1 } = await loadFixture(deployGovernanceTokenFixture);
      const transferAmount = ethers.parseEther("1000");
      
      await governanceToken.delegate(owner.address);
      const blockNumber = await ethers.provider.getBlockNumber();
      
      await governanceToken.transfer(addr1.address, transferAmount);
      
      const historicalVotes = await governanceToken.getPastVotes(owner.address, blockNumber);
      expect(historicalVotes).to.equal(await governanceToken.s_maxSupply());
    });
  });

  describe("Token Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { governanceToken, owner, addr1 } = await loadFixture(deployGovernanceTokenFixture);
      const transferAmount = ethers.parseEther("1000");
      
      await governanceToken.transfer(addr1.address, transferAmount);
      expect(await governanceToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { governanceToken, addr1, addr2 } = await loadFixture(deployGovernanceTokenFixture);
      const initialBalance = await governanceToken.balanceOf(addr1.address);
      
      await expect(
        governanceToken.connect(addr1).transfer(addr2.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      
      expect(await governanceToken.balanceOf(addr1.address)).to.equal(initialBalance);
    });
  });

});