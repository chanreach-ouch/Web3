const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ECommerceMarketplace", function () {
  let marketplace;
  let owner, seller, buyer, otherAccount;
  const productPrice = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, seller, buyer, otherAccount] = await ethers.getSigners();

    const Marketplace = await ethers.getContractFactory("ECommerceMarketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();
  });

  it("Should list a product successfully", async function () {
    const tx = await marketplace.connect(seller).listProduct("Laptop", "img_url", productPrice);
    await tx.wait();

    const count = await marketplace.productCount();
    expect(count).to.equal(1);

    const product = await marketplace.products(1);
    expect(product.name).to.equal("Laptop");
    expect(product.price).to.equal(productPrice);
    expect(product.seller).to.equal(seller.address);
    expect(product.isPurchased).to.equal(false);
  });

  it("Should allow a user to buy a product", async function () {
    await marketplace.connect(seller).listProduct("Phone", "img_url", productPrice);

    const tx = await marketplace.connect(buyer).buyProduct(1, { value: productPrice });
    await tx.wait();

    const product = await marketplace.products(1);
    expect(product.isPurchased).to.equal(true);
    expect(product.buyer).to.equal(buyer.address);
    expect(product.isDelivered).to.equal(false);
  });

  it("Should allow buyer to confirm delivery and transfer funds to seller", async function () {
    await marketplace.connect(seller).listProduct("Watch", "img_url", productPrice);
    await marketplace.connect(buyer).buyProduct(1, { value: productPrice });

    const initialSellerBalance = await ethers.provider.getBalance(seller.address);

    const tx = await marketplace.connect(buyer).confirmDelivery(1);
    await tx.wait();

    const product = await marketplace.products(1);
    expect(product.isDelivered).to.equal(true);

    const finalSellerBalance = await ethers.provider.getBalance(seller.address);
    expect(finalSellerBalance - initialSellerBalance).to.equal(productPrice);
  });

  it("Should prevent seller from buying their own product", async function () {
    await marketplace.connect(seller).listProduct("Tablet", "img_url", productPrice);
    await expect(
      marketplace.connect(seller).buyProduct(1, { value: productPrice })
    ).to.be.revertedWith("Seller cannot buy their own product");
  });

  it("Should prevent non-buyer from confirming delivery", async function () {
    await marketplace.connect(seller).listProduct("Headphones", "img_url", productPrice);
    await marketplace.connect(buyer).buyProduct(1, { value: productPrice });

    await expect(
      marketplace.connect(otherAccount).confirmDelivery(1)
    ).to.be.revertedWith("Only buyer can confirm delivery");
  });
});
