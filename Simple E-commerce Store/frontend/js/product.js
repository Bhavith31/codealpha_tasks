// Product details page
const id = new URLSearchParams(location.search).get('id');
const root = document.getElementById('product-detail');

(async function init() {
  try {
    const p = await api(`/products/${encodeURIComponent(id)}`);
    const stockClass = p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : 'stock-ok';
    const stockText = p.stock === 0 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left!` : 'In stock';
    document.title = `${p.name} | ShopEasy`;
    root.innerHTML = `
      <div class="detail">
        <div class="detail-img">${p.image}</div>
        <div>
          <span class="card-cat">${escapeHtml(p.category)}</span>
          <h1>${escapeHtml(p.name)}</h1>
          <p>${escapeHtml(p.description)}</p>
          <div class="price">${money(p.price)}</div>
          <p class="${stockClass}">${stockText}</p>
          <div class="qty-row">
            <input type="number" id="qty" min="1" max="${p.stock}" value="1" ${p.stock === 0 ? 'disabled' : ''} />
            <button class="btn" id="add" ${p.stock === 0 ? 'disabled' : ''}>Add to cart</button>
            <a class="btn btn-outline" href="cart.html">Go to cart</a>
          </div>
        </div>
      </div>`;
    document.getElementById('add').addEventListener('click', () => {
      const qty = Math.max(1, parseInt(document.getElementById('qty').value, 10) || 1);
      try { Cart.add(p, qty); toast(`Added ${qty} × ${p.name}`); } catch (e) { toast(e.message, true); }
    });
  } catch (e) {
    root.innerHTML = `<p class="empty">${escapeHtml(e.message)}</p>`;
  }
})();
