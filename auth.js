// --- Context-aware base URL ---
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';

// For local file testing, we use empty string or relative path, otherwise the full domain
const SITE_BASE = IS_LOCAL ? '' : 'https://www.knowyourproducts.in';

// Helper for local file paths
function getPath(filename) {
  if (IS_LOCAL) return filename; // Just 'eternofashion-login.html'
  return `${SITE_BASE}/${filename}`;
}

// --- Toast Notification ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toastWrap') || document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastWrap';
    document.body.appendChild(container);
  }
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// --- Get Current Session/User ---
async function getUser() {
  if (!window.db) {
    console.warn('[Eterno Auth] DB not initialized yet');
    return null;
  }
  try {
    const { data: { session } } = await window.db.auth.getSession();
    return session?.user || null;
  } catch (e) {
    console.error('[Eterno Auth] Session retrieval error:', e);
    return null;
  }
}

// --- Get User Role (with auto-create profile if missing) ---
async function getUserRole(userId) {
  if (!userId || !window.db) return { role: 'customer' };
  console.log(`[Eterno Auth] Fetching role for user ID: ${userId}...`);
  
  try {
    let { data, error } = await window.db
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      console.warn('[Eterno Auth] Profile missing, auto-creating...');
      const { data: userData } = await window.db.auth.getUser();
      const user = userData?.user;
      
      const { data: newProfile, error: upsertErr } = await window.db
        .from('profiles')
        .upsert({
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || '',
          role: 'customer'
        })
        .select('role, full_name, email')
        .single();

      if (upsertErr) return { role: 'customer' };
      return newProfile;
    }
    return data || { role: 'customer' };
  } catch (e) {
    return { role: 'customer' };
  }
}

// --- Sign Out ---
async function signOut() {
  if (!window.db) return;
  showToast('Signing out...', 'info');
  await window.db.auth.signOut();
  localStorage.removeItem('ef_cart');
  setTimeout(() => { 
    window.location.href = getPath('eternofashion-index.html'); 
  }, 800);
}

// --- Route Guard: Require Login ---
async function requireLogin() {
  const user = await getUser();
  if (!user) {
    window.location.href = getPath('eternofashion-login.html');
    return null;
  }
  return user;
}

// --- Route Guard: Require Admin ---
async function requireAdmin() {
  const user = await getUser();
  if (!user) {
    window.location.href = getPath('eternofashion-login.html');
    return null;
  }
  const profile = await getUserRole(user.id);
  if (profile.role !== 'admin') {
    showToast('Access denied — Admin only 🚫', 'error');
    setTimeout(() => { window.location.href = getPath('eternofashion-shop.html'); }, 1500);
    return null;
  }
  return { user, profile };
}

// --- Update Navbar Based on Auth State ---
async function updateNavAuth() {
  const user = await getUser();
  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const cartBadge = document.getElementById('cartBadge');
  const navLinks  = document.querySelector('.nav-links');

  if (user) {
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-flex';
      logoutBtn.onclick = signOut;
    }

    // Check role and add admin link if not present
    const profile = await getUserRole(user.id);
    if (profile.role === 'admin' && navLinks) {
      if (!document.getElementById('navAdminLink')) {
        const li = document.createElement('li');
        li.innerHTML = `<a href="eternofashion-admin.html" class="nav-link" id="navAdminLink" style="color:var(--pink);font-weight:700;">Admin Hub</a>`;
        navLinks.appendChild(li);
      }
    }

    if (cartBadge) {
      const { count } = await window.db
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      cartBadge.textContent = count || 0;
      cartBadge.style.display = (count || 0) > 0 ? 'flex' : 'none';
    }
  } else {
    if (loginBtn)  loginBtn.style.display  = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    const adminLink = document.getElementById('navAdminLink');
    if (adminLink) adminLink.parentElement.remove();
    if (cartBadge) { cartBadge.textContent = '0'; cartBadge.style.display = 'none'; }
  }
}

// --- Cart badge pulse ---
function pulseBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.classList.remove('pulse');
    void badge.offsetWidth;
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 600);
  }
}

// --- Navbar scroll effect ---
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// --- Format price ---
function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(price);
}

// --- Initials avatar ---
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
