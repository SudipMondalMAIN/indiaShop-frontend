// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════
const BASE_URL = 'https://indiashop-backend-exmc.onrender.com/api';

// ═══════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  const token = Auth.token();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE_URL + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong');
  return data;
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
const Auth = {
  token: () => localStorage.getItem('is_token'),
  user: () => { try { return JSON.parse(localStorage.getItem('is_user')); } catch { return null; } },
  isLoggedIn: () => !!localStorage.getItem('is_token'),
  set: (token, user) => { localStorage.setItem('is_token', token); localStorage.setItem('is_user', JSON.stringify(user)); },
  clear: () => { localStorage.removeItem('is_token'); localStorage.removeItem('is_user'); },
  isAdmin: () => { const u = Auth.user(); return u?.role === 'admin'; },
  isSeller: () => { const u = Auth.user(); return u?.role === 'seller'; },
};

// ═══════════════════════════════════════════════
// CART (localStorage)
// ═══════════════════════════════════════════════
const Cart = {
  get: () => { try { return JSON.parse(localStorage.getItem('is_cart')) || []; } catch { return []; } },
  save: (items) => localStorage.setItem('is_cart', JSON.stringify(items)),
  add: (product, qty = 1) => {
    const items = Cart.get();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx >= 0) items[idx].qty = Math.min(items[idx].qty + qty, 10);
    else items.push({ ...product, qty });
    Cart.save(items);
    updateCartBadge();
    toast('Added to cart!', 'success');
  },
  remove: (id) => { Cart.save(Cart.get().filter(i => i.id !== id)); updateCartBadge(); },
  update: (id, qty) => {
    if (qty < 1) { Cart.remove(id); return; }
    const items = Cart.get();
    const idx = items.findIndex(i => i.id === id);
    if (idx >= 0) { items[idx].qty = Math.min(qty, 10); Cart.save(items); }
    updateCartBadge();
  },
  clear: () => { localStorage.removeItem('is_cart'); updateCartBadge(); },
  count: () => Cart.get().reduce((s, i) => s + i.qty, 0),
  total: () => Cart.get().reduce((s, i) => s + i.price * i.qty, 0),
};

function updateCartBadge() {
  const c = Cart.count();
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = c;
    el.style.display = c > 0 ? 'flex' : 'none';
  });
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function toast(msg, type = '') {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
    document.body.appendChild(el);
  }
  const t = document.createElement('div');
  const colors = { success: '#2ecc71', error: '#e74c3c', '': '#333' };
  t.style.cssText = `background:${colors[type]||colors['']};color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.2);animation:slideUp 0.3s ease;white-space:nowrap;`;
  t.textContent = msg;
  el.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ═══════════════════════════════════════════════
// BUTTON LOADING
// ═══════════════════════════════════════════════
function btnLoading(btn, loading) {
  if (loading) {
    btn._orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._orig || btn.innerHTML;
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════
// FORMAT PRICE
// ═══════════════════════════════════════════════
function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ═══════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════
function productCard(p) {
  const disc = p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
  return `
    <div class="card product-card" onclick="window.location='product-detail.html?id=${p.id}'">
      <div class="product-img-wrap">
        <img src="${p.image || 'https://placehold.co/200x200?text=Img'}" alt="${p.name}" loading="lazy">
        ${disc ? `<div class="product-disc-badge">${disc}% off</div>` : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        ${p.brand ? `<div class="product-brand">${p.brand}</div>` : ''}
        <div class="product-price-row">
          <span class="fw-700 fs-15">${formatPrice(p.price)}</span>
          ${p.original_price > p.price ? `<span style="text-decoration:line-through;color:var(--text3);font-size:12px">${formatPrice(p.original_price)}</span>` : ''}
          ${p.rating ? `<span class="star-badge" style="font-size:10px;padding:2px 5px">${p.rating}★</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════
// SKELETON CARDS
// ═══════════════════════════════════════════════
function skeletonCards(n, container) {
  if (!container) return;
  container.innerHTML = Array(n).fill(`
    <div class="card">
      <div class="skeleton" style="height:160px;border-radius:var(--radius) var(--radius) 0 0"></div>
      <div style="padding:12px">
        <div class="skeleton" style="height:12px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:12px;width:60%"></div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════
// OTP HELPERS
// ═══════════════════════════════════════════════
function initOTPInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach((inp, i) => {
    inp.value = '';
    inp.addEventListener('input', () => {
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
    });
    inp.addEventListener('paste', e => {
      const paste = e.clipboardData.getData('text').replace(/\D/g, '');
      if (paste.length === 6) {
        [...inputs].forEach((inp2, j) => inp2.value = paste[j] || '');
        inputs[5].focus();
        e.preventDefault();
      }
    });
  });
  inputs[0]?.focus();
}

function getOTPValue() {
  return [...document.querySelectorAll('.otp-input')].map(i => i.value).join('');
}

let _otpInterval;
function startOTPTimer(seconds) {
  clearInterval(_otpInterval);
  let s = seconds;
  const el = document.getElementById('otp-timer');
  if (!el) return;
  _otpInterval = setInterval(() => {
    s--;
    if (!document.getElementById('otp-timer')) { clearInterval(_otpInterval); return; }
    if (s <= 0) {
      clearInterval(_otpInterval);
      document.getElementById('otp-timer').parentElement.innerHTML = `<a href="#" onclick="resendOTP();return false" style="color:var(--primary);font-weight:600;font-size:13px">Resend OTP</a>`;
    } else {
      document.getElementById('otp-timer').textContent = `${s}s`;
    }
  }, 1000);
}

// ═══════════════════════════════════════════════
// NAVBAR BUILDER
// ═══════════════════════════════════════════════
function buildNavbar(active) {
  // Detect depth
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const isSubfolder = depth >= 3; // pages/seller/ or pages/admin/
  const isPages = depth >= 2;
  const root = isSubfolder ? '../../' : isPages ? '../' : '';
  const pagesRoot = isSubfolder ? '../' : '';

  const user = Auth.user();
  const cartCount = Cart.count();

  // TOP NAVBAR
  const navbar = document.querySelector('.navbar .container');
  if (navbar) {
    navbar.innerHTML = `
      <a href="${root}index.html" class="nav-logo">india<span>Shop</span></a>
      <div class="nav-search-wrap">
        <form class="nav-search" onsubmit="doSearch(event)">
          <input type="text" id="nav-search-input" placeholder="Search products, brands and more..." autocomplete="off">
          <button type="submit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </form>
      </div>
      <div class="nav-actions">
        ${user ? `<div class="nav-user-chip" onclick="window.location='${pagesRoot || root + 'pages/'}account.html'">
          <div class="nav-avatar">${user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <span class="nav-username">${user.name?.split(' ')[0]}</span>
        </div>` : `<a href="${pagesRoot || root + 'pages/'}login.html" class="btn btn-outline btn-sm">Login</a>`}
        <a href="${pagesRoot || root + 'pages/'}cart.html" class="nav-cart-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          <span class="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
        </a>
      </div>`;
  }

  // BOTTOM NAV
  const bottom = document.querySelector('.bottom-nav');
  if (bottom) {
    const items = [
      { id: 'home', label: 'Home', href: `${root}index.html`, icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
      { id: 'products', label: 'Shop', href: `${pagesRoot || root + 'pages/'}products.html`, icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>` },
      { id: 'cart', label: 'Cart', href: `${pagesRoot || root + 'pages/'}cart.html`, icon: `<span style="position:relative"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg><span class="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span></span>` },
      { id: 'account', label: 'Account', href: `${pagesRoot || root + 'pages/'}account.html`, icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    ];
    bottom.innerHTML = items.map(item => `
      <a href="${item.href}" class="bottom-nav-item${active === item.id ? ' active' : ''}">
        ${item.icon}
        <span>${item.label}</span>
      </a>`).join('');
  }

  updateCartBadge();
}

function doSearch(e) {
  e.preventDefault();
  const q = document.getElementById('nav-search-input')?.value?.trim();
  if (!q) return;
  const isSubfolder = window.location.pathname.split('/').filter(Boolean).length >= 3;
  const isPages = window.location.pathname.split('/').filter(Boolean).length >= 2;
  const root = isSubfolder ? '../' : isPages ? '' : 'pages/';
  window.location.href = `${root}products.html?q=${encodeURIComponent(q)}`;
}

// ═══════════════════════════════════════════════
// CSS INJECTION (animations)
// ═══════════════════════════════════════════════
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;
document.head.appendChild(styleEl);
