require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const db = require('./db');
let escrowArtifact;
try {
    escrowArtifact = require('../artifacts/contracts/Escrow.sol/Escrow.json');
} catch (e) {
    escrowArtifact = require('./artifacts/contracts/Escrow.sol/Escrow.json');
}

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; 
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.JsonRpcProvider(RPC_URL);
const adminWallet = new ethers.Wallet(PRIVATE_KEY, provider);

const DUMMY_USERS = [
    { name: "Alice (Buyer)", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
    { name: "Bob (Seller)", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" },
    { name: "Charlie (Shopper)", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" }
];

app.get('/api/accounts', async (req, res) => {
    try {
        const accountsWithBalance = await Promise.all(DUMMY_USERS.map(async (u) => {
            const balanceWei = await provider.getBalance(u.address);
            const balanceEth = ethers.formatEther(balanceWei);
            return { name: u.name, address: u.address, balance: parseFloat(balanceEth).toFixed(4) };
        }));
        res.json(accountsWithBalance);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch balances" });
    }
});

app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/orders', (req, res) => {
    const query = `
        SELECT orders.id as orderId, orders.buyer, orders.escrowAddress, orders.quantity, orders.isDelivered,
               products.id as productId, products.name, products.price, products.seller, products.imageHash
        FROM orders 
        JOIN products ON orders.productId = products.id 
        ORDER BY orders.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/products', (req, res) => {
    const { name, imageHash, price, seller, stock } = req.body;
    db.run(
        "INSERT INTO products (name, imageHash, price, seller, stock) VALUES (?, ?, ?, ?, ?)",
        [name, imageHash || 'https://via.placeholder.com/400', price, seller, parseInt(stock) || 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.post('/api/buy', async (req, res) => {
    const { productId, buyerAddress, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    
    const buyer = DUMMY_USERS.find(u => u.address.toLowerCase() === buyerAddress.toLowerCase());
    if (!buyer) return res.status(403).json({ error: "Invalid dummy user account" });

    db.get("SELECT * FROM products WHERE id = ?", [productId], async (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: "Product not found" });
        if (product.stock < qty) return res.status(400).json({ error: `Only ${product.stock} left in stock` });
        if (buyerAddress.toLowerCase() === product.seller.toLowerCase()) return res.status(400).json({ error: "Sellers cannot buy their own products" });

        try {
            // Calculate total price based on quantity
            const unitPrice = parseFloat(product.price);
            const totalPrice = unitPrice * qty;
            
            // Format to exactly 18 decimals avoiding floating point artifacts
            // ethers.parseEther expects a string representing ether
            const totalPriceString = totalPrice.toLocaleString('fullwide', {useGrouping:false, maximumFractionDigits:18});
            const totalWei = ethers.parseEther(totalPriceString);

            // Deploy Escrow Contract
            const factory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, adminWallet);
            const contract = await factory.deploy(product.seller, buyerAddress, totalWei);
            await contract.waitForDeployment();
            const contractAddress = await contract.getAddress();

            // Send ETH (Bulk amount)
            const buyerWallet = new ethers.Wallet(buyer.privateKey, provider);
            const tx = await buyerWallet.sendTransaction({
                to: contractAddress,
                value: totalWei
            });
            await tx.wait();

            // Update Stock and Create Order
            db.serialize(() => {
                db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [qty, productId]);
                db.run(
                    "INSERT INTO orders (productId, buyer, escrowAddress, quantity) VALUES (?, ?, ?, ?)",
                    [productId, buyerAddress, contractAddress, qty],
                    function(insertErr) {
                        if (insertErr) return res.status(500).json({ error: insertErr.message });
                        res.json({ success: true, contractAddress, orderId: this.lastID });
                    }
                );
            });
        } catch (deployErr) {
            console.error(deployErr);
            res.status(500).json({ error: "Failed to deploy escrow and transfer funds" });
        }
    });
});

app.post('/api/confirm', async (req, res) => {
    const { orderId, buyerAddress } = req.body;
    
    const query = `SELECT orders.*, products.price, products.seller 
                   FROM orders JOIN products ON orders.productId = products.id 
                   WHERE orders.id = ?`;
                   
    db.get(query, [orderId], async (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.isDelivered) return res.status(400).json({ error: "Already delivered" });
        if (order.buyer.toLowerCase() !== buyerAddress.toLowerCase()) return res.status(403).json({ error: "Only the buyer can confirm" });

        try {
            const escrowContract = new ethers.Contract(order.escrowAddress, escrowArtifact.abi, adminWallet);
            const isFunded = await escrowContract.isFunded();
            if (!isFunded) return res.status(400).json({ error: "Escrow not funded." });

            const tx = await escrowContract.releaseFunds();
            await tx.wait();

            db.run("UPDATE orders SET isDelivered = 1 WHERE id = ?", [orderId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ success: true });
            });
        } catch (txErr) {
            console.error(txErr);
            res.status(500).json({ error: "Failed to release funds on blockchain" });
        }
    });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Web 2.0 Backend running on http://localhost:${PORT}`));
