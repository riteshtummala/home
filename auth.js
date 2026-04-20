// ===========================
// Auth Utilities — Eterno Fashion
// ===========================

// --- Toast Notification ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// --- Get Current Session/User ---
async function getUser() {
  const { data: { session } } = await db.auth.getSession();
  return session?.user || null;
}

// --- Get User Role from profiles table ---
async function getUserRole(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', userId)
    .single();
  if (error) return { role: 'customer', full_name: '', avatar_url: '' };
  return data || { role: 'customer', full_name: '', avatar_url: '' };
}

// --- Sign in with Google OAuth ---
async function signInWithGoogle(role = 'customer') {
  localStorage.setItem('intended_role', role);
  const redirectTo = 'https://www.knowyourproducts.in/eternofashion-login.html';
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
  if (error) showToast('Sign in failed: ' + error.message, 'error');
}

// --- Sign Out ---
async function signOut() {
  showToast('Signing out...', 'info');
  await db.auth.signOut();
  localStorage.removeItem('intended_role');
  localStorage.removeItem('ef_cart');
  setTimeout(() => { window.location.href = 'https://www.knowyourproducts.in/eternofashion-index.html'; }, 800);
}

// --- Route Guard: Require Login ---
async function requireLogin() {
  const user = await getUser();
  if (!user) {
    window.location.href = 'https://www.knowyourproducts.in/eternofashion-login.html';
    return null;
  }
  return user;
}

// --- Route Guard: Require Admin ---
async function requireAdmin() {
  const user = await getUser();
  if (!user) { window.location.href = 'https://www.knowyourproducts.in/eternofashion-login.html'; return null; }
  const profile = await getUserRole(user.id);
  if (profile.role !== 'admin') {
    showToast('Access denied. Admin only. 🚫', 'error');
    setTimeout(() => { window.location.href = 'https://www.knowyourproducts.in/eternofashion-shop.html'; }, 1500);
    return null;
  }
  return { user, profile };
}

// --- Update Navbar Based on Auth State ---
async function updateNavAuth() {
  const user = await getUser();
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const cartBadge = document.getElementById('cartBadge');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-flex';
      logoutBtn.onclick = signOut;
    }
    if (cartBadge) {
      const { count } = await db
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      cartBadge.textContent = count || 0;
      if ((count || 0) > 0) cartBadge.style.display = 'flex';
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (cartBadge) cartBadge.textContent = '0';
  }
}

// --- Navbar scroll effect ---
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }
}, { passive: true });

// --- Format currency (Indian Rupees) ---
function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
}

// --- Create initials avatar text ---
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
