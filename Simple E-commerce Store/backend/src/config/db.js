const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'store.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    price       REAL NOT NULL CHECK (price >= 0),
    category    TEXT NOT NULL,
    image       TEXT NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    subtotal         REAL NOT NULL,
    shipping         REAL NOT NULL,
    total            REAL NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_method   TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'Placed',
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name       TEXT NOT NULL,
    price      REAL NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0)
  );
`);

// ---------- Seed sample products (first run only) ----------
const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
if (count === 0) {
  const seed = [
    ['Wireless Headphones', 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.', 3499, 'Electronics', '🎧', 25],
    ['Smart Watch', 'Fitness tracker with heart-rate monitor, GPS and a bright AMOLED display.', 4999, 'Electronics', '⌚', 18],
    ['Mechanical Keyboard', 'Compact RGB keyboard with hot-swappable switches and aluminium frame.', 2799, 'Electronics', '⌨️', 30],
    ['Portable Speaker', 'Waterproof Bluetooth speaker with deep bass and 12-hour playtime.', 1999, 'Electronics', '🔊', 40],
    ['Running Shoes', 'Lightweight breathable shoes with cushioned soles for daily runs.', 2599, 'Fashion', '👟', 50],
    ['Denim Jacket', 'Classic fit denim jacket made from durable stretch cotton.', 1899, 'Fashion', '🧥', 22],
    ['Leather Backpack', 'Water-resistant 20L backpack with padded laptop compartment.', 2299, 'Fashion', '🎒', 35],
    ['Sunglasses', 'UV400 polarised sunglasses with a lightweight metal frame.', 899, 'Fashion', '🕶️', 60],
    ['Ceramic Coffee Mug Set', 'Set of 4 handcrafted ceramic mugs, microwave and dishwasher safe.', 799, 'Home', '☕', 45],
    ['Desk Lamp', 'LED desk lamp with touch dimmer, 3 colour modes and USB charging port.', 1299, 'Home', '💡', 28],
    ['Indoor Plant Pot', 'Minimalist ceramic planter with bamboo stand, perfect for small plants.', 599, 'Home', '🪴', 70],
    ['JavaScript: The Good Parts', 'A concise guide to the elegant features of JavaScript.', 499, 'Books', '📘', 80],
    ['Atomic Habits', 'A practical framework for building good habits and breaking bad ones.', 549, 'Books', '📗', 100],
  ];
  const insert = db.prepare(
    'INSERT INTO products (name, description, price, category, image, stock) VALUES (?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => seed.forEach((row) => insert.run(...row)))();
  console.log(`Seeded ${seed.length} sample products`);
}

module.exports = db;
