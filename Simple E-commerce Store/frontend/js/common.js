const API = '/api';

const Auth = {
  get token() { 
    return localStorage.getItem('token'); 
  },
  get user() { 
    try { 
      return JSON.parse(localStorage.getItem('user')); 
    } catch { return null; } },
  save(token, user) { 
    localStorage.setItem('token', token); 
    localStorage.setItem('user', JSON.stringify(user)); 
  },
  logout() { 
    localStorage.removeItem('token'); 
    localStorage.removeItem('user'); 
    window.location.href = 'index.html'; 
  },
};

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) {
    headers.Authorization = `Bearer ${Auth.token}`;
  }
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && Auth.token) { localStorage.removeItem('token'); localStorage.removeItem('user'); }
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

const FREE_SHIPPING_ABOVE = 999;
const SHIPPING_FEE = 49;

const Cart = {
  items() { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } },
  save(items) { localStorage.setItem('cart', JSON.stringify(items)); updateCartBadge(); },
  add(product, qty = 1) {
    const items = this.items();
    const found = items.find((i) => i.id === product.id);
    const current = found ? found.quantity : 0;
    if (current + qty > product.stock) {
      throw new Error(`Only ${product.stock} in stock`);
    }
    if (found) {
      found.quantity += qty;
    }
    else {
      items.push({ id: product.id, name: product.name, price: product.price, image: product.image, stock: product.stock, quantity: qty });
    this.save(items);
    }
  },
  setQty(id, qty) {
    const items = this.items();
    const item = items.find((i) => i.id === id);
    if (!item){
      return;
    } 
    item.quantity = Math.max(1, Math.min(qty, item.stock));
    this.save(items);
  },
  remove(id) { 
    this.save(this.items().filter((i) => i.id !== id)); 
  },
  clear() { 
    this.save([]); 
  },
  count() { 
    return this.items().reduce((n, i) => n + i.quantity, 0); 
  },
  subtotal() { 
    return this.items().reduce((s, i) => s + i.price * i.quantity, 0); 
  },
  shipping() { 
    const s = this.subtotal(); return s === 0 || s >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE; 
  },
  total() { return this.subtotal() + this.shipping(); },
};

const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(message, isError = false) {
  let el = document.getElementById('toast');
  if (!el) { 
    el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); 
  }
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = Cart.count();
}

function renderLayout() {
  const user = Auth.user && Auth.token ? Auth.user : null;
  document.getElementById('site-header').innerHTML = `
    <header class="site-header"><div class="container nav">
      <a class="logo" href="index.html">🛍️ ShopEasy</a>
      <nav class="nav-links">
        <a href="index.html">Products</a>
        <a href="cart.html">Cart <span class="cart-badge" id="cart-count">0</span></a>
        ${user
          ? `<a href="orders.html">My Orders</a><span class="user-chip">Hi, ${escapeHtml(user.name.split(' ')[0])}</span><a href="#" id="logout-link">Logout</a>`
          : `<a href="login.html">Login / Register</a>`}
      </nav>
    </div></header>`;
  document.getElementById('site-footer').innerHTML =
    '<footer class="site-footer">© 2026 ShopEasy — Simple E-commerce Store demo project</footer>';
  const logout = document.getElementById('logout-link');
  if (logout) logout.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
  updateCartBadge();
}

document.addEventListener('DOMContentLoaded', renderLayout);
