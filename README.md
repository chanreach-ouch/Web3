# SimplePurchase DApp

A decentralized escrow application built with React, ethers.js, and Tailwind CSS. This project allows a buyer to securely lock funds in a smart contract and release them to a seller only upon confirming delivery.

## Features
- **MetaMask Integration:** Seamlessly connect wallet and view network status.
- **Smart Contract Interaction:** Load the escrow contract dynamically and interact with it.
- **Security:** Built-in safeguards ensure only the buyer can confirm delivery, and funds can only be released once.
- **Automated Testing:** Includes a full Hardhat test suite to verify the smart contract logic and security.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS v4
- **Web3:** ethers.js v6
- **Smart Contract / Backend:** Solidity, Hardhat

## Getting Started

### Prerequisites
- Node.js installed
- MetaMask browser extension installed

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Testing the Smart Contract
To run the automated security tests:
```bash
npx hardhat test
```

## How to Use
1. Deploy the `contracts/SimplePurchase.sol` smart contract (e.g., using Remix IDE or Hardhat) and fund it with the purchase amount.
2. Open the DApp frontend and click **Connect MetaMask**.
3. Paste the deployed contract's address into the input field and click **Load Contract**.
4. The buyer can click **Confirm Delivery** to release the locked funds to the seller.
