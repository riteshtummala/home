// ===========================
// Cart Page Logic — Eterno Fashion
// ===========================

const CART_BASE = 'https://www.knowyourproducts.in';
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

  // Fetch cart items joined with product details
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

  // Filter out any items where products might be null (product deleted)
  cartItems = (data || []).filter(item => item.products);

  if (!cartItems.length) {
    content.innerHTML = `
      <div class="empty-state" style="padding:120px 0;">
        <span class="empty-icon">🛒</span>
        <h3>Your cart is empty</h3>
        <p>Discover our curated collection and find your next favourite piece.</p>
        <a href="shop.html" class="btn btn-gold btn-large">Browse Collection</a>
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
      <!-- Cart Items -->
      <div class="cart-left">
        <div class="cart-header-row">
          <h1 class="cart-title">Your Cart</h1>
          <span class="cart-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
        </div>

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
            <tbody id="cartTableBody">
              ${cartItems.map(item => renderCartRow(item)).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <a href="${CART_BASE}/shop.html" class="btn btn-outline">← Continue Shopping</a>
          <button class="btn btn-danger btn-sm" onclick="clearCart()">🗑 Clear Cart</button>
        </div>
      </div>

      <!-- Order Summary -->
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
          🚚 <strong>Transport charges</strong> will be calculated based on your delivery location and communicated separately.
        </div>

        <button class="btn btn-gold" style="width:100%;justify-content:center;" onclick="placeOrder(${subtotal})">
          Place Order — ₹${subtotal.toLocaleString('en-IN')}
        </button>

        <p style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-top:14px;">
          🔒 Secure checkout via Eterno Fashion
        </p>
      </div>
    </div>
  `;

  // Update badge count
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = cartItems.length;
    badge.style.display = cartItems.length > 0 ? 'flex' : 'none';
  }
}

function renderCartRow(item) {
  const p = item.products;
  const lineTotal = p.price * item.quantity;
  return `
    <tr class="cart-row cart-border-row" id="row-${item.id}">
      <td>
        <div class="cart-item-info">
          <img
            class="cart-item-img"
            src="${p.image_url || 'https://placehold.co/72x72/1a1510/d4a853?text=EF'}"
            alt="${p.name}"
            onerror="this.src='https://placehold.co/72x72/1a1510/d4a853?text=EF'"
          >
          <div>
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-cat">${p.category || 'Fashion'}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQty('${item.id}', ${item.quantity - 1})">−</button>
          <span class="qty-value" id="qty-${item.id}">${item.quantity}</span>
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

async function updateQty(cartItemId, newQty) {
  if (newQty < 1) {
    await removeFromCart(cartItemId);
    return;
  }

  const { error } = await db
    .from('cart_items')
    .update({ quantity: newQty })
    .eq('id', cartItemId)
    .eq('user_id', currentUser.id);

  if (error) {
    showToast('Could not update quantity', 'error');
    return;
  }

  // Update local state
  const item = cartItems.find(i => i.id === cartItemId);
  if (item) item.quantity = newQty;

  renderCart();
}

async function removeFromCart(cartItemId) {
  const row = document.getElementById(`row-${cartItemId}`);
  if (row) { row.style.opacity = '0.4'; row.style.transform = 'translateX(-10px)'; row.style.transition = '0.3s'; }

  const { error } = await db
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('user_id', currentUser.id);

  if (error) {
    showToast('Could not remove item', 'error');
    if (row) { row.style.opacity = '1'; row.style.transform = 'none'; }
    return;
  }

  cartItems = cartItems.filter(i => i.id !== cartItemId);
  showToast('Item removed from cart', 'success');
  renderCart();
  await updateNavAuth();
}

async function clearCart() {
  if (!confirm('Remove all items from your cart?')) return;

  const { error } = await db
    .from('cart_items')
    .delete()
    .eq('user_id', currentUser.id);

  if (error) { showToast('Could not clear cart', 'error'); return; }

  cartItems = [];
  showToast('Cart cleared', 'success');
  renderCart();
  await updateNavAuth();
}

async function placeOrder(total) {
  if (!cartItems.length) return;

  // Show modal
  document.getElementById('orderTotal').textContent = `Order Total: ₹${total.toLocaleString('en-IN')} (+ transport charges)`;
  document.getElementById('orderModal').style.display = 'flex';

  // Clear cart after order
  await db.from('cart_items').delete().eq('user_id', currentUser.id);
  cartItems = [];
  await updateNavAuth();
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
  window.location.href = `${CART_BASE}/shop.html`;
}

// Start
initCart();
