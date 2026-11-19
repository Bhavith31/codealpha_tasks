// Express REST API + static hosting for the frontend.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- Auth helpers ----------
const sign = (u) => jwt.sign({ id: u.id, username: u.username }, SECRET, { expiresIn: '7d' });

function readToken(req) {
  const h = req.headers.authorization || '';
  try { return jwt.verify(h.replace('Bearer ', ''), SECRET); } catch { return null; }
}
const optionalAuth = (req, _res, next) => { req.user = readToken(req); next(); };
const requireAuth = (req, res, next) => {
  req.user = readToken(req);
  return req.user ? next() : res.status(401).json({ error: 'Please log in first.' });
};

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username || '')) return res.status(400).json({ error: 'Username must be 3-20 letters, numbers or _.' });
  if ((password || '').length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return res.status(409).json({ error: 'That username is taken.' });
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, bcrypt.hashSync(password, 10));
  res.json({ token: sign({ id: info.lastInsertRowid, username }), username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u || !bcrypt.compareSync(password || '', u.password_hash)) return res.status(401).json({ error: 'Wrong username or password.' });
  res.json({ token: sign(u), username: u.username });
});

// ---------- Posts ----------
const POST_SELECT = `
  SELECT p.id, p.content, p.created_at, u.username,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = @me) AS liked
  FROM posts p JOIN users u ON u.id = p.user_id`;

app.get('/api/posts', optionalAuth, (req, res) => {
  const me = req.user ? req.user.id : 0;
  const following = req.query.scope === 'following' && me;
  const sql = POST_SELECT + (following
    ? ' WHERE p.user_id = @me OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = @me)'
    : '') + ' ORDER BY p.id DESC LIMIT 50';
  res.json(db.prepare(sql).all({ me }));
});

app.post('/api/posts', requireAuth, (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content || content.length > 280) return res.status(400).json({ error: 'Posts need 1-280 characters.' });
  db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)').run(req.user.id, content);
  res.json({ ok: true });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- Likes (toggle) ----------
app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const args = [req.user.id, req.params.id];
  const removed = db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(...args).changes;
  if (!removed) db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(...args);
  res.json({ liked: !removed });
});

// ---------- Comments ----------
app.get('/api/posts/:id/comments', (req, res) => {
  res.json(db.prepare(`SELECT c.id, c.content, c.created_at, u.username FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.id`).all(req.params.id));
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content || content.length > 200) return res.status(400).json({ error: 'Comments need 1-200 characters.' });
  db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content);
  res.json({ ok: true });
});

// ---------- Profiles & follows ----------
app.get('/api/users/:username', optionalAuth, (req, res) => {
  const me = req.user ? req.user.id : 0;
  const u = db.prepare('SELECT id, username, bio, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const count = (sql) => db.prepare(sql).get(u.id).n;
  res.json({
    ...u,
    followers: count('SELECT COUNT(*) n FROM follows WHERE following_id = ?'),
    following: count('SELECT COUNT(*) n FROM follows WHERE follower_id = ?'),
    is_following: !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(me, u.id),
    posts: db.prepare(POST_SELECT + ' WHERE p.user_id = @uid ORDER BY p.id DESC').all({ me, uid: u.id }),
  });
});

app.post('/api/users/:username/follow', requireAuth, (req, res) => {
  const t = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!t || t.id === req.user.id) return res.status(400).json({ error: 'You cannot follow this account.' });
  const args = [req.user.id, t.id];
  const removed = db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(...args).changes;
  if (!removed) db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(...args);
  res.json({ following: !removed });
});

app.put('/api/me', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run((req.body.bio || '').slice(0, 160), req.user.id);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
