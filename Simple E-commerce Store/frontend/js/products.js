let activeCategory = 'All';
let searchTimer;

async function loadCategories() {
  const cats = ['All', ...(await api('/products/categories'))];
  const box = document.getElementById('categories');
  box.innerHTML = cats.map((c) => `<button class="chip ${c === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  box.querySelectorAll('.chip').forEach((btn) => btn.addEventListener('click', () => {
    activeCategory = btn.dataset.cat;
    loadCategories();
    loadProducts();
  }));
}

async function loadProducts() {
  const grid = document.getElementById('products');
  const q = encodeURIComponent(document.getElementById('search').value.trim());
  try {
    const products = await api(`/products?search=${q}&category=${encodeURIComponent(activeCategory)}`);
    if (!products.length) { 
      grid.innerHTML = '<p class="empty" style="grid-column:1/-1">No products found.</p>'; 
      return; 
    }
    grid.innerHTML = products.map((p) => `
      <article class="card">
        <a href="product.html?id=${p.id}"><div class="card-img">${p.image}</div></a>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(p.category)}</span>
          <a class="card-title" href="product.html?id=${p.id}">${escapeHtml(p.name)}</a>
          <span class="price">${money(p.price)}</span>
          <div class="card-actions">
            <button class="btn btn-block add-btn" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
          </div>
        </div>
      </article>`).join('');
    grid.querySelectorAll('.add-btn').forEach((btn) => btn.addEventListener('click', () => {
      const product = products.find((p) => p.id === Number(btn.dataset.id));
      try { Cart.add(product); toast(`${product.name} added to cart`); } catch (e) { toast(e.message, true); }
    }));
  } catch (e) {
    grid.innerHTML = `<p class="empty" style="grid-column:1/-1">${escapeHtml(e.message)}</p>`;
  }
}

document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 300);
});

loadCategories();
loadProducts();
