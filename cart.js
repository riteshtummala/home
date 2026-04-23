// ===========================
// Cart Page Logic — Eterno Fashion
// ===========================

// CART_BASE is managed via relative paths or auth.js getPath()
let cartItems = [];
let currentUser = null;

async function initCart() {
  currentUser = await requireLogin();
  if (!currentUser) return;
  await updateNavAuth();
  await loadCart();
}

async function loadCart() {
  const content = document.getElementById('cartContent');

  const { data, error } = await db
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products (
        id, name, description, price, image_url, category
      )
    `)
    .eq('user_id', currentUser.id)
    .order('added_at', { ascending: false });

  if (error) {
    content.innerHTML = `<div class="empty-state" style="padding:80px 0;">
      <span class="empty-icon">⚠️</span>
      <h3>Error loading cart</h3>
      <p>${error.message}</p>
    </div>`;
    return;
  }

  cartItems = (data || []).filter(item => item.products);

  if (!cartItems.length) {
    content.innerHTML = `
      <div class="empty-state" style="padding:120px 0;">
        <span class="empty-icon">🛒</span>
        <h3>Your cart is empty</h3>
        <p>Discover our curated drops and find your next fire piece.</p>
        <a href="eternofashion-shop.html" class="btn btn-gold btn-large">Shop the Drop 🛍️</a>
      </div>`;
    return;
  }

  renderCart();
}

function renderCart() {
  const content = document.getElementById('cartContent');
  const subtotal = cartItems.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  content.innerHTML = `
    <div class="cart-layout">

      <!-- LEFT: Cart Items -->
      <div class="cart-left">
        <div class="cart-header-row">
          <h1 class="cart-title">Your Cart</h1>
          <span class="cart-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
        </div>

        <!-- DESKTOP TABLE -->
        <div class="cart-table-wrap">
          <table class="cart-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${cartItems.map(item => renderCartRow(item)).join('')}
            </tbody>
          </table>
        </div>

        <!-- MOBILE CARDS -->
        <div class="cart-cards">
          ${cartItems.map(item => renderCartCard(item)).join('')}
        </div>

        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <a href="eternofashion-shop.html" class="btn btn-outline">← Keep Shopping</a>
          <button class="btn btn-danger btn-sm" onclick="clearCart()">🗑 Clear All</button>
        </div>
      </div>

      <!-- RIGHT: Order Summary -->
      <div class="cart-summary">
        <h3 class="summary-title">Order Summary</h3>

        <div class="summary-row">
          <span class="summary-label">Subtotal (${itemCount} items)</span>
          <span class="summary-value">₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Discount</span>
          <span class="summary-value" style="color:var(--success)">—</span>
        </div>

        <hr class="summary-divider">

        <div class="summary-total">
          <span class="total-label">Total</span>
          <span class="total-value">₹${subtotal.toLocaleString('en-IN')}</span>
        </div>

        <div class="transport-note">
          🚚 <strong>Transport charges</strong> calculated at delivery based on your location.
        </div>

        <button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:4px;" onclick="placeOrder(${subtotal})">
          Place Order — ₹${subtotal.toLocaleString('en-IN')}
        </button>

        <p style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-top:14px;">
          🔒 Secure checkout · Eterno Fashion
        </p>
      </div>
    </div>
  `;

  // Update badge
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = cartItems.length;
    badge.style.display = cartItems.length > 0 ? 'flex' : 'none';
  }
}

// Desktop table row
function renderCartRow(item) {
  const p = item.products;
  const lineTotal = p.price * item.quantity;
  return `
    <tr class="cart-row cart-border-row" id="row-${item.id}">
      <td>
        <div class="cart-item-info">
          <img class="cart-item-img"
            src="${p.image_url || 'https://placehold.co/72x72/100f1a/F72585?text=EF'}"
            alt="${p.name}"
            onerror="this.src='https://placehold.co/72x72/100f1a/F72585?text=EF'">
          <div>
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-cat">${p.category || 'Fashion'}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQty('${item.id}', ${item.quantity - 1})">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}', ${item.quantity + 1})">+</button>
        </div>
      </td>
      <td>
        <div class="cart-price">₹${lineTotal.toLocaleString('en-IN')}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">₹${Number(p.price).toLocaleString('en-IN')} each</div>
      </td>
      <td>
        <button class="cart-remove" onclick="removeFromCart('${item.id}')" title="Remove">✕</button>
      </td>
    </tr>
  `;
}

// Mobile card
function renderCartCard(item) {
  const p = item.products;
  const lineTotal = p.price * item.quantity;
  return `
    <div class="cart-card" id="card-${item.id}">
      <img class="cart-card-img"
        src="${p.image_url || 'https://placehold.co/80x80/100f1a/F72585?text=EF'}"
        alt="${p.name}"
        onerror="this.src='https://placehold.co/80x80/100f1a/F72585?text=EF'">
      <div class="cart-card-body">
        <div class="cart-card-name">${p.name}</div>
        <div class="cart-card-cat">${p.category || 'Fashion'}</div>
        <div class="cart-card-bottom">
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQty('${item.id}', ${item.quantity - 1})">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQty('${item.id}', ${item.quantity + 1})">+</button>
          </div>
          <div class="cart-card-price">₹${lineTotal.toLocaleString('en-IN')}</div>
          <button class="cart-remove" onclick="removeFromCart('${item.id}')" title="Remove">✕</button>
        </div>
      </div>
    </div>
  `;
}

async function updateQty(cartItemId, newQty) {
  if (newQty < 1) { await removeFromCart(cartItemId); return; }

  const { error } = await db
    .from('cart_items')
    .update({ quantity: newQty })
    .eq('id', cartItemId)
    .eq('user_id', currentUser.id);

  if (error) { showToast('Could not update quantity', 'error'); return; }

  const item = cartItems.find(i => i.id === cartItemId);
  if (item) item.quantity = newQty;
  renderCart();
}

async function removeFromCart(cartItemId) {
  const els = [
    document.getElementById(`row-${cartItemId}`),
    document.getElementById(`card-${cartItemId}`)
  ];
  els.forEach(el => {
    if (el) { el.style.opacity = '0.3'; el.style.transform = 'scale(0.95)'; el.style.transition = '0.3s'; }
  });

  const { error } = await db
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('user_id', currentUser.id);

  if (error) {
    showToast('Could not remove item', 'error');
    els.forEach(el => { if (el) { el.style.opacity = '1'; el.style.transform = 'none'; } });
    return;
  }

  cartItems = cartItems.filter(i => i.id !== cartItemId);
  showToast('Removed from cart 🗑', 'success');
  renderCart();
  await updateNavAuth();
}

async function clearCart() {
  if (!confirm('Remove all items from your cart?')) return;

  const { error } = await window.db.from('cart_items').delete().eq('user_id', currentUser.id);
  if (error) { showToast('Could not clear cart', 'error'); return; }

  cartItems = [];
  showToast('Cart cleared 🗑', 'success');
  renderCart();
  await updateNavAuth();
}

async function placeOrder(total) {
  if (!cartItems.length) return;

  document.getElementById('orderTotal').textContent = `Order Total: ₹${total.toLocaleString('en-IN')} (+ delivery charges)`;
  document.getElementById('orderModal').style.display = 'flex';

  await window.db.from('cart_items').delete().eq('user_id', currentUser.id);
  cartItems = [];
  await updateNavAuth();
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
  window.location.href = "eternofashion-shop.html";
}

// Start
initCart();
