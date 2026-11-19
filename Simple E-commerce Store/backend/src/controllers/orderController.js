const db = require('../config/db');
const httpError = require('../utils/httpError');

const FREE_SHIPPING_ABOVE = 999;
const SHIPPING_FEE = 49;
const PAYMENT_METHODS = ['COD', 'Card', 'UPI'];

exports.create = (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = 'COD' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, 'Your cart is empty');
    }
    if (!shippingAddress || shippingAddress.trim().length < 10) {
      throw httpError(400, 'Please enter a complete shipping address');
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)){
      throw httpError(400, 'Invalid payment method');
    } 

    const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
    const insertOrder = db.prepare(
      `INSERT INTO orders (user_id, subtotal, shipping, total, shipping_address, payment_method)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)'
    );
    const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    const placeOrder = db.transaction(() => {
      let subtotal = 0;
      const lines = [];

      for (const item of items) {
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty < 1) {
          throw httpError(400, 'Invalid quantity');
        }
        const product = getProduct.get(item.productId);
        if (!product){
          throw httpError(400, 'A product in your cart no longer exists');
        } 
        if (product.stock < qty) {
          throw httpError(400, `Only ${product.stock} unit(s) of "${product.name}" left in stock`);
        }
        subtotal += product.price * qty;
        lines.push({ product, qty });
      }

      const shipping = subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
      const total = subtotal + shipping;

      const info = insertOrder.run(
        req.user.id, subtotal, shipping, total, shippingAddress.trim(), paymentMethod
      );
      const orderId = Number(info.lastInsertRowid);
      for (const { product, qty } of lines) {
        insertItem.run(orderId, product.id, product.name, product.price, qty);
        reduceStock.run(qty, product.id);
      }
      return { orderId, total };
    });

    const result = placeOrder();
    res.status(201).json({ message: 'Order placed successfully', ...result });
  } catch (err) {
    next(err);
  }
};

const withItems = (order) => ({
  ...order,
  items: db.prepare('SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ?').all(order.id),
});

exports.listMine = (req, res, next) => {
  try {
    const orders = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
      .all(req.user.id);
    res.json(orders.map(withItems));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const order = db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!order) throw httpError(404, 'Order not found');
    res.json(withItems(order));
  } catch (err) {
    next(err);
  }
};
