const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimplePurchase", function () {
  let simplePurchase;
  let buyer;
  let seller;
  let otherAccount;
  const purchasePrice = ethers.parseEther("1.0"); // 1 ETH

  beforeEach(async function () {
    // Get accounts from hardhat
    [buyer, seller, otherAccount] = await ethers.getSigners();

    // Deploy the contract using buyer's account
    const SimplePurchase = await ethers.getContractFactory("SimplePurchase", buyer);
    simplePurchase = await SimplePurchase.deploy(seller.address, { value: purchasePrice });
    await simplePurchase.waitForDeployment();
  });

  it("Should set the correct buyer and seller", async function () {
    expect(await simplePurchase.buyer()).to.equal(buyer.address);
    expect(await simplePurchase.seller()).to.equal(seller.address);
  });

  it("Should have the correct balance initially", async function () {
    expect(await simplePurchase.getBalance()).to.equal(purchasePrice);
    expect(await simplePurchase.isCompleted()).to.equal(false);
  });

  it("Should fail if a non-buyer tries to confirm delivery", async function () {
    // Connect as otherAccount
    const simplePurchaseAsOther = simplePurchase.connect(otherAccount);
    
    await expect(
      simplePurchaseAsOther.confirmDelivery()
    ).to.be.revertedWith("Error: Only the buyer can confirm delivery.");
  });

  it("Should let the buyer confirm delivery and transfer funds to seller", async function () {
    // Check initial seller balance
    const initialSellerBalance = await ethers.provider.getBalance(seller.address);

    // Confirm delivery as buyer
    const tx = await simplePurchase.confirmDelivery();
    await tx.wait();

    // Check status updated
    expect(await simplePurchase.isCompleted()).to.equal(true);

    // Check contract balance is 0
    expect(await simplePurchase.getBalance()).to.equal(0n);

    // Check seller balance increased by purchasePrice
    const finalSellerBalance = await ethers.provider.getBalance(seller.address);
    expect(finalSellerBalance - initialSellerBalance).to.equal(purchasePrice);
  });

  it("Should fail if trying to confirm delivery twice", async function () {
    await simplePurchase.confirmDelivery();
    
    await expect(
      simplePurchase.confirmDelivery()
    ).to.be.revertedWith("Error: This transaction is already completed.");
  });
});
