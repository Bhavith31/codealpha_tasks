const root = document.getElementById('orders-root');
const placedId = new URLSearchParams(location.search).get('placed');

(async function init() {
  if (!Auth.token) {
    root.innerHTML = '<div class="panel empty">Please <a href="login.html" style="color:var(--primary);font-weight:600">login</a> to see your orders.</div>';
    return;
  }
  try {
    const orders = await api('/orders');
    const banner = placedId ? `<div class="success-banner">🎉 Order #${escapeHtml(placedId)} placed successfully. Thank you for shopping with us!</div>` : '';
    if (!orders.length) { 
      root.innerHTML = '<div class="panel empty">You have not placed any orders yet.</div>'; 
      return;
    }
    root.innerHTML = banner + orders.map((o) => `
      <div class="order">
        <div class="order-head">
          <div><strong>Order #${o.id}</strong> <span class="hint">· ${new Date(o.created_at + 'Z').toLocaleString()}</span></div>
          <span class="status">${escapeHtml(o.status)}</span>
        </div>
        ${o.items.map((i) => `<div class="order-item"><span>${escapeHtml(i.name)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></div>`).join('')}
        <div class="order-item"><span>Shipping</span><span>${o.shipping === 0 ? 'FREE' : money(o.shipping)}</span></div>
        <div class="summary-line summary-total"><span>Total (${escapeHtml(o.payment_method)})</span><span>${money(o.total)}</span></div>
        <p class="hint">Deliver to: ${escapeHtml(o.shipping_address)}</p>
      </div>`).join('');
  } catch (e) {
    root.innerHTML = `<div class="panel empty">${escapeHtml(e.message)}</div>`;
  }
})();
