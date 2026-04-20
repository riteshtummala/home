// ===========================
// Interactive UI — Eterno Fashion
// ===========================

const BASE_URL = 'https://www.knowyourproducts.in';

// ===========================
// 1. SCROLL REVEAL (IntersectionObserver)
// ===========================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('revealed');
      }, entry.target.dataset.delay || 0);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

function initReveal() {
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.dataset.delay = (i % 4) * 80;
    revealObserver.observe(el);
  });
}

// ===========================
// 2. ANIMATED COUNTER
// ===========================
function animateCounter(el, target, suffix = '', duration = 1800) {
  if (!el || el.dataset.animated) return;
  el.dataset.animated = true;
  const startTime = performance.now();
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    el.textContent = Math.round(target * eased) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Auto-animate stat numbers when they come into view
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const raw = el.dataset.count;
      const suffix = el.dataset.suffix || '';
      if (raw) animateCounter(el, parseInt(raw), suffix);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

function initCounters() {
  document.querySelectorAll('[data-count]').forEach(el => statObserver.observe(el));
}

// ===========================
// 3. MOBILE HAMBURGER MENU
// ===========================
function initMobileMenu() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Create hamburger if not exists
  if (!document.getElementById('hamburger')) {
    const hamburger = document.createElement('button');
    hamburger.id = 'hamburger';
    hamburger.className = 'hamburger';
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.onclick = toggleMobileMenu;

    const navActions = navbar.querySelector('.nav-actions');
    if (navActions) navActions.prepend(hamburger);
  }

  // Create mobile drawer
  if (!document.getElementById('mobileDrawer')) {
    const drawer = document.createElement('div');
    drawer.id = 'mobileDrawer';
    drawer.className = 'mobile-drawer';
    drawer.innerHTML = `
      <div class="mobile-drawer-inner">
        <button class="mobile-close" onclick="toggleMobileMenu()">✕</button>
        <div class="nav-logo" style="margin-bottom:32px;">
          <span class="logo-text">Eterno</span>
          <span class="logo-sub">Fashion</span>
        </div>
        <nav class="mobile-nav">
          <a href="${BASE_URL}/" class="mobile-nav-link">🏠 Home</a>
          <a href="${BASE_URL}/shop.html" class="mobile-nav-link">🛍️ Shop</a>
          <a href="${BASE_URL}/cart.html" class="mobile-nav-link">🛒 Cart</a>
          <a href="${BASE_URL}/login.html" class="mobile-nav-link">👤 Sign In</a>
        </nav>
      </div>
    `;
    document.body.appendChild(drawer);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'drawerOverlay';
    overlay.className = 'drawer-overlay';
    overlay.onclick = toggleMobileMenu;
    document.body.appendChild(overlay);
  }
}

let menuOpen = false;
function toggleMobileMenu() {
  menuOpen = !menuOpen;
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const hamburger = document.getElementById('hamburger');
  if (drawer) drawer.classList.toggle('open', menuOpen);
  if (overlay) overlay.classList.toggle('open', menuOpen);
  if (hamburger) hamburger.classList.toggle('open', menuOpen);
  document.body.style.overflow = menuOpen ? 'hidden' : '';
}

// ===========================
// 4. RIPPLE EFFECT ON BUTTONS
// ===========================
function addRipple(e) {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `
    position:absolute;
    border-radius:50%;
    background:rgba(255,255,255,0.25);
    width:${size}px;
    height:${size}px;
    left:${e.clientX - rect.left - size/2}px;
    top:${e.clientY - rect.top - size/2}px;
    animation:rippleOut 0.5s ease-out forwards;
    pointer-events:none;
  `;
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function initRipple() {
  document.querySelectorAll('.btn-gold, .btn-outline, .btn-ghost').forEach(btn => {
    btn.removeEventListener('click', addRipple);
    btn.addEventListener('click', addRipple);
  });
}

// ===========================
// 5. CURSOR GLOW EFFECT (Desktop)
// ===========================
function initCursorGlow() {
  if (window.matchMedia('(hover: none)').matches) return;
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);

  document.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
    glow.style.opacity = '1';
  }, { passive: true });

  document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
}

// ===========================
// 6. HERO PARALLAX
// ===========================
function initParallax() {
  const heroBg = document.querySelector('.hero-bg');
  const heroGrid = document.querySelector('.hero-grid');
  if (!heroBg) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (heroBg) heroBg.style.transform = `translateY(${y * 0.3}px)`;
    if (heroGrid) heroGrid.style.transform = `translateY(${y * 0.15}px)`;
  }, { passive: true });
}

// ===========================
// 7. PRODUCT QUICK-VIEW MODAL
// ===========================
function createQuickViewModal() {
  if (document.getElementById('quickViewModal')) return;
  const modal = document.createElement('div');
  modal.id = 'quickViewModal';
  modal.className = 'modal-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="quickview-card" id="quickViewCard">
      <button class="quickview-close" onclick="closeQuickView()">✕</button>
      <div class="quickview-img-wrap">
        <img id="qvImg" src="" alt="" class="quickview-img">
        <span id="qvCategory" class="product-category-tag"></span>
      </div>
      <div class="quickview-info">
        <h2 class="quickview-name" id="qvName"></h2>
        <div class="quickview-price" id="qvPrice"></div>
        <p class="quickview-desc" id="qvDesc"></p>
        <button class="btn btn-gold btn-large" id="qvCartBtn" style="width:100%;justify-content:center;margin-top:24px;">
          🛒 Add to Cart
        </button>
        <a href="${BASE_URL}/shop.html" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:10px;">
          View All Items
        </a>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeQuickView();
  });
  document.body.appendChild(modal);
}

function openQuickView(product, addToCartFn) {
  createQuickViewModal();
  document.getElementById('qvImg').src = product.image_url || 'https://placehold.co/400x400/1a1510/d4a853?text=Eterno';
  document.getElementById('qvImg').alt = product.name;
  document.getElementById('qvName').textContent = product.name;
  document.getElementById('qvCategory').textContent = product.category || 'Fashion';
  document.getElementById('qvPrice').textContent = '₹' + Number(product.price).toLocaleString('en-IN');
  document.getElementById('qvDesc').textContent = product.description || 'A beautiful curated vintage piece. Quality checked and ready for a new home.';
  document.getElementById('qvCartBtn').onclick = () => {
    closeQuickView();
    addToCartFn(product.id);
  };
  const modal = document.getElementById('quickViewModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('.quickview-card').classList.add('open'), 10);
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  const card = modal?.querySelector('.quickview-card');
  if (card) card.classList.remove('open');
  setTimeout(() => {
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }, 280);
}

// Escape key to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeQuickView();
    const orderModal = document.getElementById('orderModal');
    const deleteModal = document.getElementById('deleteModal');
    if (orderModal && orderModal.style.display !== 'none') orderModal.style.display = 'none';
    if (deleteModal && deleteModal.style.display !== 'none') deleteModal.style.display = 'none';
  }
});

// ===========================
// 8. CART BADGE PULSE
// ===========================
function pulseBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.classList.remove('pulse');
    void badge.offsetWidth; // reflow
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 600);
  }
}

// ===========================
// 9. SKELETON LOADING CARDS
// ===========================
function getSkeletonCards(count = 8) {
  return Array(count).fill(0).map(() => `
    <div class="product-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="product-info">
        <div class="skeleton-line" style="width:70%;height:18px;margin-bottom:8px;"></div>
        <div class="skeleton-line" style="width:90%;height:13px;margin-bottom:4px;"></div>
        <div class="skeleton-line" style="width:60%;height:13px;margin-bottom:20px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="skeleton-line" style="width:80px;height:24px;"></div>
          <div class="skeleton-line" style="width:46px;height:46px;border-radius:50%;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ===========================
// INIT ALL
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initCounters();
  initMobileMenu();
  initRipple();
  initCursorGlow();
  initParallax();
  createQuickViewModal();
});

// Re-init ripple after dynamic content loads
window.addEventListener('productsLoaded', initRipple);
