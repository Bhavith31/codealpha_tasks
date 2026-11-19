const db = require('../config/db');
const httpError = require('../utils/httpError');

exports.list = (req, res, next) => {
  try {
    const { search, category } = req.query;
    const where = [];
    const params = [];

    if (search) {
      where.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'All') {
      where.push('category = ?');
      params.push(category);
    }

    const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`;
    res.json(db.prepare(sql).all(...params));
  } catch (err) {
    next(err);
  }
};

exports.categories = (req, res, next) => {
  try {
    const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
    res.json(rows.map((r) => r.category));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) throw httpError(404, 'Product not found');
    res.json(product);
  } catch (err) {
    next(err);
  }
};
