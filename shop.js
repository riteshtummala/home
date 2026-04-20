// ===========================
// Shop Page Logic — Eterno Fashion
// ===========================

const SHOP_BASE = 'https://www.knowyourproducts.in';
let allProducts = [];
let currentUser = null;
let activeCategory = '';

async function initShop() {
  await updateNavAuth();
  currentUser = await getUser();

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.style.display = currentUser ? 'none' : 'inline-flex';

  // Show skeleton
  document.getElementById('productsGrid').innerHTML = getSkeletonCards(8);

  await loadAllProducts();
}

async function loadAllProducts() {
  const { data: products, error } = await db
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  allProducts = products || [];

  const countEl = document.getElementById('productCount');
  if (countEl) {
    countEl.textContent = allProducts.length
      ? `${allProducts.length} piece${allProducts.length !== 1 ? 's' : ''} available`
      : 'No items yet — check back soon!';
  }

  if (error) {
    document.getElementById('productsGrid').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Could not load products</h3>
        <p>${error.message}</p>
      </div>`;
    return;
  }

  renderProducts(allProducts);
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🛍️</span>
      <h3>No pieces found</h3>
      <p>Try a different category or clear your search.</p>
      <button class="btn btn-outline btn-sm" onclick="clearFilters()">Clear Filters</button>
    </div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card reveal" id="pcard-${p.id}">
      <div class="product-img-wrap">
        <img
          class="product-img"
          src="${p.image_url || 'https://placehold.co/400x300/1a1510/d4a853?text=Eterno'}"
          alt="${p.name}" loading="lazy"
          onerror="this.src='https://placehold.co/400x300/1a1510/d4a853?text=Eterno'"
        >
        <span class="product-category-tag">${p.category || 'Fashion'}</span>
        <div class="card-overlay">
          <button class="overlay-btn overlay-btn-view" onclick='openQuickView(${JSON.stringify(p).replace(/\\/g,"\\\\").replace(/"/g,"&quot;")}, addToCart)'>👁 Quick View</button>
          <button class="overlay-btn overlay-btn-cart" onclick="addToCart('${p.id}')">🛒 Add</button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || 'A unique vintage piece.'}</div>
        <div class="product-footer">
          <div class="product-price"><span class="currency">₹</span>${Number(p.price).toLocaleString('en-IN')}</div>
          <button class="btn-cart" id="cartBtn-${p.id}" onclick="addToCart('${p.id}')" title="Add to Cart">🛒</button>
        </div>
      </div>
    </div>
  `).join('');

  initReveal();
  window.dispatchEvent(new Event('productsLoaded'));
}

// Category chip selection
function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === cat);
  });
  filterProducts();
}

function filterProducts() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const sort = document.getElementById('sortFilter')?.value || 'newest';

  let filtered = allProducts.filter(p => {
    const matchSearch = !query ||
      p.name.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query);
    const matchCat = !activeCategory || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const countEl = document.getElementById('productCount');
  if (countEl) {
    countEl.textContent = filtered.length
      ? `${filtered.length} piece${filtered.length !== 1 ? 's' : ''} found`
      : 'No pieces found';
  }

  renderProducts(filtered);
}

function clearFilters() {
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
  if (document.getElementById('sortFilter')) document.getElementById('sortFilter').value = 'newest';
  setCategory('');
}

async function addToCart(productId) {
  if (!currentUser) {
    showToast('Please sign in to add items to your cart 🔒', 'error');
    setTimeout(() => { window.location.href = `${SHOP_BASE}/eternofashion-login.html`; }, 1600);
    return;
  }

  const btn = document.getElementById(`cartBtn-${productId}`);
  if (btn) { btn.innerHTML = '⏳'; btn.disabled = true; }

  const { error } = await db
    .from('cart_items')
    .upsert(
      { user_id: currentUser.id, product_id: productId, quantity: 1 },
      { onConflict: 'user_id,product_id', ignoreDuplicates: false }
    );

  if (error) {
    showToast('Could not add to cart: ' + error.message, 'error');
    if (btn) { btn.innerHTML = '🛒'; btn.disabled = false; }
  } else {
    if (btn) { btn.innerHTML = '✓'; btn.classList.add('added'); }
    showToast('Added to cart! 🛒', 'success');
    pulseBadge();
    await updateNavAuth();
    setTimeout(() => {
      if (btn) { btn.innerHTML = '🛒'; btn.classList.remove('added'); btn.disabled = false; }
    }, 2000);
  }
}

// Start
initShop();
