const root = document.getElementById('cart-root');

function render() {
  const items = Cart.items();
  if (!items.length) {
    root.innerHTML = '<div class="panel empty">Your cart is empty. <a href="index.html" style="color:var(--primary);font-weight:600">Continue shopping →</a></div>';
    return;
  }
  const loggedIn = Auth.token && Auth.user;

  root.innerHTML = `
    <div class="two-col">
      <div class="panel">
        ${items.map((i) => `
          <div class="cart-row">
            <div class="cart-emoji">${i.image}</div>
            <div>
              <a href="product.html?id=${i.id}"><strong>${escapeHtml(i.name)}</strong></a>
              <div class="hint">${money(i.price)} each</div>
              <button class="btn-link" data-remove="${i.id}">Remove</button>
            </div>
            <div class="qty-ctrl">
              <button data-dec="${i.id}">−</button><span>${i.quantity}</span><button data-inc="${i.id}">+</button>
            </div>
            <strong>${money(i.price * i.quantity)}</strong>
          </div>`).join('')}
      </div>
      <div class="panel">
        <h3>Order Summary</h3>
        <div class="summary-line"><span>Subtotal</span><span>${money(Cart.subtotal())}</span></div>
        <div class="summary-line"><span>Shipping</span><span>${Cart.shipping() === 0 ? 'FREE' : money(Cart.shipping())}</span></div>
        <div class="summary-line summary-total"><span>Total</span><span>${money(Cart.total())}</span></div>
        <p class="hint">Free shipping on orders above ${money(FREE_SHIPPING_ABOVE)}.</p>
        ${loggedIn ? `
          <form id="checkout-form">
            <label for="address">Shipping address</label>
            <textarea id="address" rows="3" placeholder="House no, street, city, PIN code" required></textarea>
            <label for="payment">Payment method</label>
            <select id="payment">
              <option value="COD">Cash on Delivery</option>
              <option value="UPI">UPI (demo)</option>
              <option value="Card">Card (demo)</option>
            </select>
            <button class="btn btn-block" id="place-btn" style="margin-top:18px">Place Order</button>
          </form>`
        : `<a class="btn btn-block" style="margin-top:18px;text-align:center" href="login.html?next=cart.html">Login to checkout</a>`}
      </div>
    </div>`;

  root.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => change(+b.dataset.inc, 1)));
  root.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => change(+b.dataset.dec, -1)));
  root.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => { Cart.remove(+b.dataset.remove); render(); }));
  const form = document.getElementById('checkout-form');
  if (form) form.addEventListener('submit', placeOrder);
}

function change(id, delta) {
  const item = Cart.items().find((i) => i.id === id);
  if (item) { Cart.setQty(id, item.quantity + delta); render(); }
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('place-btn');
  btn.disabled = true; btn.textContent = 'Placing order...';
  try {
    const result = await api('/orders', {
      method: 'POST',
      body: {
        items: Cart.items().map((i) => ({ productId: i.id, quantity: i.quantity })),
        shippingAddress: document.getElementById('address').value,
        paymentMethod: document.getElementById('payment').value,
      },
    });
    Cart.clear();
    window.location.href = `orders.html?placed=${result.orderId}`;
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false; btn.textContent = 'Place Order';
    if (!Auth.token) render();
  }
}

render();
