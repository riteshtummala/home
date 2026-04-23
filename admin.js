// ===========================
// Admin Dashboard Logic — Eterno Fashion
// ===========================

let adminUser = null;
let allAdminProducts = [];
let allCustomers = [];
let imgMode = 'url'; // 'url' or 'file'
let selectedFile = null;
let productToDelete = null;

// ===========================
// INIT
// ===========================
async function initAdmin() {
  const result = await requireAdmin();
  if (!result) return;

  adminUser = result.user;
  const profile = result.profile;

  // Populate sidebar user info
  const nameEl = document.getElementById('adminName');
  const avatarEl = document.getElementById('adminAvatar');
  if (nameEl) nameEl.textContent = profile.full_name || adminUser.email?.split('@')[0] || 'Admin';
  if (avatarEl) avatarEl.textContent = getInitials(profile.full_name || adminUser.email || 'A');

  // Update last updated time
  const lastUpdated = document.getElementById('lastUpdated');
  if (lastUpdated) lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleTimeString('en-IN');

  await loadDashboard();
}

// ===========================
// SECTION NAVIGATION
// ===========================
function showSection(section) {
  const sections = ['dashboard', 'products', 'customers'];
  sections.forEach(s => {
    const el = document.getElementById(`section${capitalize(s)}`);
    const nav = document.getElementById(`nav${capitalize(s)}`);
    if (el) el.style.display = s === section ? 'block' : 'none';
    if (nav) nav.classList.toggle('active', s === section);
  });

  if (section === 'products') loadAdminProducts();
  if (section === 'customers') loadCustomers();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ===========================
// DASHBOARD
// ===========================
async function loadDashboard() {
  // Products count
  const { count: prodCount } = await db
    .from('products')
    .select('id', { count: 'exact', head: true });
  setEl('statTotalProducts', prodCount ?? 0);

  // Customers count
  const { count: custCount } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer');
  setEl('statTotalCustomers', custCount ?? 0);

  // Active cart items
  const { count: cartCount } = await db
    .from('cart_items')
    .select('id', { count: 'exact', head: true });
  setEl('statTotalCartItems', cartCount ?? 0);

  // Recent products table
  const { data: recent } = await db
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const tbody = document.getElementById('recentProductsBody');
  if (tbody) {
    tbody.innerHTML = !recent?.length
      ? `<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--text-muted);">No products yet. Upload your first item!</td></tr>`
      : recent.map(p => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="${p.image_url || 'https://placehold.co/48x48/1a1510/d4a853?text=EF'}"
                alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:var(--bg-mid);"
                onerror="this.src='https://placehold.co/48x48/1a1510/d4a853?text=EF'">
              <span style="font-weight:500;color:var(--text-primary);">${p.name}</span>
            </div>
          </td>
          <td><span class="badge badge-customer">${p.category || '—'}</span></td>
          <td style="color:var(--gold);font-weight:600;">?${Number(p.price).toLocaleString('en-IN')}</td>
          <td>${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
        </tr>
      `).join('');
  }
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ===========================
// PRODUCTS
// ===========================
async function loadAdminProducts() {
  const container = document.getElementById('adminProductsGrid');
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading products...</p></div>`;

  const { data, error } = await db
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">??</span><h3>Error</h3><p>${error.message}</p></div>`;
    return;
  }

  allAdminProducts = data || [];
  const countEl = document.getElementById('productCount');
  if (countEl) countEl.textContent = `(${allAdminProducts.length})`;

  renderAdminProducts(allAdminProducts);
}

function renderAdminProducts(products) {
  const container = document.getElementById('adminProductsGrid');

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">??</span>
        <h3>No products yet</h3>
        <p>Use the form above to upload your first item.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="products-admin-grid">
      ${products.map(p => `
        <div class="product-admin-card" id="adminCard-${p.id}">
          <img
            class="product-admin-img"
            src="${p.image_url || 'https://placehold.co/240x180/1a1510/d4a853?text=Eterno'}"
            alt="${p.name}"
            onerror="this.src='https://placehold.co/240x180/1a1510/d4a853?text=Eterno'"
          >
          <div class="product-admin-body">
            <div class="product-admin-name">${p.name}</div>
            <div class="product-admin-cat">${p.category || '—'}</div>
            <div class="product-admin-price">?${Number(p.price).toLocaleString('en-IN')}</div>
            <div class="product-admin-actions">
              <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
                ?? Delete
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function filterAdminProducts() {
  const q = document.getElementById('adminProductSearch').value.toLowerCase();
  const filtered = allAdminProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q)
  );
  renderAdminProducts(filtered);
}

// Image Mode Toggle
function setImgMode(mode) {
  imgMode = mode;
  selectedFile = null;
  document.getElementById('toggleUrl').classList.toggle('active', mode === 'url');
  document.getElementById('toggleFile').classList.toggle('active', mode === 'file');
  document.getElementById('imgUrlInput').style.display = mode === 'url' ? 'block' : 'none';
  document.getElementById('imgFileInput').style.display = mode === 'file' ? 'block' : 'none';
  document.getElementById('fileName').textContent = '';
}

function previewFile(event) {
  selectedFile = event.target.files[0];
  if (selectedFile) {
    document.getElementById('fileName').textContent = `? ${selectedFile.name}`;
  }
}

// Upload Product
async function uploadProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('uploadBtn');
  const status = document.getElementById('uploadStatus');

  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const description = document.getElementById('productDesc').value.trim();

  if (!name || !category || !price) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Uploading...';
  status.textContent = '';

  let imageUrl = '';

  try {
    if (imgMode === 'file' && selectedFile) {
      // Upload to Supabase Storage
      status.textContent = 'Uploading image...';
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: storageError } = await window.db.storage
        .from('product-images')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

      if (storageError) throw new Error('Image upload failed: ' + storageError.message);

      const { data: urlData } = window.db.storage
        .from('product-images')
        .getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
      status.textContent = 'Image uploaded! Saving product...';
    } else {
      imageUrl = document.getElementById('productImageUrl').value.trim();
    }

    // Insert product
    const { error: insertError } = await window.db.from('products').insert({
      name,
      category,
      price,
      description,
      image_url: imageUrl || null
    });

    if (insertError) throw new Error(insertError.message);

    showToast(`"${name}" uploaded successfully! ??`, 'success');
    resetUploadForm();
    await loadAdminProducts();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload Product';
    status.textContent = '';
  }
}

function resetUploadForm() {
  document.getElementById('uploadForm').reset();
  selectedFile = null;
  document.getElementById('fileName').textContent = '';
  setImgMode('url');
}

// Delete Product
function confirmDelete(productId, productName) {
  productToDelete = productId;
  document.getElementById('deleteModal').style.display = 'flex';
  document.getElementById('confirmDeleteBtn').onclick = () => deleteProduct(productId);
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  productToDelete = null;
}

async function deleteProduct(productId) {
  closeDeleteModal();

  const card = document.getElementById(`adminCard-${productId}`);
  if (card) { card.style.opacity = '0.4'; card.style.transform = 'scale(0.95)'; card.style.transition = '0.3s'; }

  // Delete from cart_items first (FK constraint)
  await window.db.from('cart_items').delete().eq('product_id', productId);

  const { error } = await window.db.from('products').delete().eq('id', productId);

  if (error) {
    showToast('Could not delete product: ' + error.message, 'error');
    if (card) { card.style.opacity = '1'; card.style.transform = 'none'; }
    return;
  }

  showToast('Product deleted successfully', 'success');
  allAdminProducts = allAdminProducts.filter(p => p.id !== productId);
  renderAdminProducts(allAdminProducts);
  await loadDashboard();
}

// ===========================
// CUSTOMERS
// ===========================
async function loadCustomers() {
  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;"><div class="spinner" style="margin:0 auto;display:block;"></div></td></tr>`;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--danger);">${error.message}</td></tr>`;
    return;
  }

  allCustomers = data || [];
  const countEl = document.getElementById('customerCount');
  if (countEl) countEl.textContent = `(${allCustomers.length})`;

  renderCustomers(allCustomers);
}

function renderCustomers(customers) {
  const tbody = document.getElementById('customersTableBody');

  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:36px;color:var(--text-muted);">No customers registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar" style="width:36px;height:36px;font-size:0.85rem;">${getInitials(c.full_name || c.email || '?')}</div>
          <span style="font-weight:500;color:var(--text-primary);">${c.full_name || 'No name'}</span>
        </div>
      </td>
      <td>${c.email || '—'}</td>
      <td>
        <span class="badge ${c.role === 'admin' ? 'badge-admin' : 'badge-customer'}">
          ${c.role === 'admin' ? '?? Admin' : '??? Customer'}
        </span>
      </td>
      <td>${c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
    </tr>
  `).join('');
}

function filterCustomers() {
  const q = document.getElementById('customerSearch').value.toLowerCase();
  const filtered = allCustomers.filter(c =>
    (c.full_name || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.role || '').toLowerCase().includes(q)
  );
  renderCustomers(filtered);
}

// Start
initAdmin();
