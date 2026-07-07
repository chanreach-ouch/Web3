const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'marketplace.db'), (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    db.run("PRAGMA foreign_keys = ON;");
    
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        imageHash TEXT,
        price TEXT,
        seller TEXT,
        stock INTEGER DEFAULT 1
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER,
        buyer TEXT,
        escrowAddress TEXT,
        quantity INTEGER DEFAULT 1,
        isDelivered BOOLEAN DEFAULT 0,
        FOREIGN KEY (productId) REFERENCES products (id)
    )`);
  }
});

module.exports = db;
