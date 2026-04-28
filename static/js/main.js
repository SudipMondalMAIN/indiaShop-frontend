// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════
const BASE_URL = 'https://indiashop-backend-exmc.onrender.com/api';

// ═══════════════════════════════════════════════
// SECURITY - HTML ESCAPE
// ═══════════════════════════════════════════════
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ════════════��══════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════
async function api(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = Auth.token();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    
    const res = await fetch(BASE_URL + path, opts);
    
    if (!res.ok && res.status === 401) {
      Auth.clear();
      window.location.href = 'login.html';
      return;
    }
    
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      const errMsg = data.message || data.error || 'Something went wrong';
      throw new Error(errMsg);
    }
    
    return data;
  } catch (err) {
    toast(err.message || 'API Error', 'error');
    throw err;
  }
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
const Auth = {
  token: () => localStorage.getItem('is_token'),
  user: () => {
    try {
      const u = localStorage.getItem('is_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  isLoggedIn: () => !!localStorage.getItem('is_token'),
  set: (token, user) => {
    localStorage.setItem('is_token', token);
    localStorage.setItem('is_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('is_token');
    localStorage.removeItem('is_user');
  },
  isAdmin: () => {
    const u = Auth.user();
    return u?.role === 'admin';
  },
  isSeller: () => {
    const u = Auth.user();
    return u?.role === 'seller';
  },
};

// ═══════════════════════════════════════════════
// CART (localStorage)
// ═══════════════════════════════════════════════
const Cart = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem('is_cart')) || [];
    } catch {
      return [];
    }
  },
  save: (items) => {
    localStorage.setItem('is_cart', JSON.stringify(items));
  },
  add: (product, qty = 1) => {
    try {
      if (!product || !product.id) {
        toast('Invalid product', 'error');
        return;
      }
      
      const items = Cart.get();
      const idx = items.findIndex(i => i.id === product.id);
      
      if (idx >= 0) {
        items[idx].qty = Math.min(items[idx].qty + qty, 10);
      } else {
        items.push({ ...product, qty });
      }
      
      Cart.save(items);
      updateCartBadge();
      toast('Added to cart!', 'success');
    } catch (err) {
      toast('Error adding to cart', 'error');
    }
  },
  remove: (id) => {
    try {
      Cart.save(Cart.get().filter(i => i.id !== id));
      updateCartBadge();
    } catch (err) {
      toast('Error removing from cart', 'error');
    }
  },
  update: (id, qty) => {
    try {
      if (qty < 1) {
        Cart.remove(id);
        return;
      }
      
      const items = Cart.get();
      const idx = items.findIndex(i => i.id === id);
      
      if (idx >= 0) {
        items[idx].qty = Math.min(qty, 10);
        Cart.save(items);
      }
      
      updateCartBadge();
    } catch (err) {
      toast('Error updating cart', 'error');
    }
  },
  clear: () => {
    try {
      localStorage.removeItem('is_cart');
      updateCartBadge();
    } catch (err) {
      toast('Error clearing cart', 'error');
    }
  },
  count: () => {
    try {
      return Cart.get().reduce((s, i) => s + (i.qty || 0), 0);
    } catch {
      return 0;
    }
  },
  total: () => {
    try {
      return Cart.get().reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
    } catch {
      return 0;
    }
  },
};

function updateCartBadge() {
  try {
    const c = Cart.count();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });
  } catch (err) {
    console.error('Error updating cart badge:', err);
  }
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function toast(msg, type = '') {
  try {
    if (!msg) return;
    
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
      document.body.appendChild(el);
    }
    
    const t = document.createElement('div');
    const colors = { success: '#2ecc71', error: '#e74c3c', '': '#333' };
    t.style.cssText = `background:${colors[type] || colors['']};color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.2);animation:slideUp 0.3s ease;white-space:nowrap;`;
    t.textContent = escapeHtml(msg);
    el.appendChild(t);
    
    setTimeout(() => t.remove(), 2800);
  } catch (err) {
    console.error('Toast error:', err);
  }
}

// ═══════════════════════════════════════════════
// BUTTON LOADING
// ═══════════════════════════════════════════════
function btnLoading(btn, loading) {
  try {
    if (!btn) return;
    
    if (loading) {
      btn._orig = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span>';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._orig || btn.innerHTML;
      btn.disabled = false;
    }
  } catch (err) {
    console.error('Button loading error:', err);
  }
}

// ═══════════════════════════════════════════════
// FORMAT PRICE
// ═══════════════════════════════════════════════
function formatPrice(n) {
  try {
    const num = Number(n) || 0;
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } catch {
    return '₹0';
  }
}

// ═══════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════
function productCard(p) {
  try {
    if (!p || !p.id) return '';
    
    const price = Number(p.price) || 0;
    const origPrice = Number(p.original_price) || price;
    const disc = origPrice > price ? Math.round((1 - price / origPrice) * 100) : 0;
    
    const image = escapeHtml(p.image || 'https://placehold.co/200x200?text=Img');
    const name = escapeHtml(p.name || 'Product');
    const brand = escapeHtml(p.brand || '');
    const id = escapeHtml(p.id);
    const rating = p.rating ? escapeHtml(String(p.rating)) : '';
    
    return `
      <div class="card product-card" onclick="window.location='product-detail.html?id=${id}'" style="cursor:pointer;">
        <div class="product-img-wrap">
          <img src="${image}" alt="${name}" loading="lazy" onerror="this.src='https://placehold.co/200x200?text=Img'">
          ${disc ? `<div class="product-disc-badge">${disc}% off</div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${name}</div>
          ${brand ? `<div class="product-brand">${brand}</div>` : ''}
          <div class="product-price-row">
            <span class="fw-700 fs-15">${formatPrice(price)}</span>
            ${origPrice > price ? `<span style="text-decoration:line-through;color:var(--text3);font-size:12px">${formatPrice(origPrice)}</span>` : ''}
            ${rating ? `<span class="star-badge" style="font-size:10px;padding:2px 5px">${rating}★</span>` : ''}
          </div>
        </div>
      </div>`;
  } catch (err) {
    console.error('Product card error:', err);
    return '';
  }
}

// ═══════════════════════════════════════════════
// SKELETON CARDS
// ═══════════════════════════════════════════════
function skeletonCards(n, container) {
  try {
    if (!container) return;
    
    container.innerHTML = Array(n).fill(`
      <div class="card">
        <div class="skeleton" style="height:160px;border-radius:var(--radius) var(--radius) 0 0"></div>
        <div style="padding:12px">
          <div class="skeleton" style="height:12px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:12px;width:60%"></div>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Skeleton cards error:', err);
  }
}

// ═══════════════════════════════════════════════
// OTP HELPERS
// ═══════════════════════════════════════════════
function initOTPInputs() {
  try {
    const inputs = document.querySelectorAll('.otp-input');
    
    inputs.forEach((inp, i) => {
      inp.value = '';
      
      inp.addEventListener('input', (e) => {
        if (inp.value && i < inputs.length - 1) {
          inputs[i + 1].focus();
        }
      });
      
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && i > 0) {
          inputs[i - 1].focus();
        }
      });
      
      inp.addEventListener('paste', (e) => {
        const paste = e.clipboardData.getData('text').replace(/\D/g, '');
        if (paste.length === 6) {
          [...inputs].forEach((inp2, j) => inp2.value = paste[j] || '');
          inputs[5].focus();
          e.preventDefault();
        }
      });
    });
    
    inputs[0]?.focus();
  } catch (err) {
    console.error('OTP input error:', err);
  }
}

function getOTPValue() {
  try {
    return [...document.querySelectorAll('.otp-input')]
      .map(i => i.value || '')
      .join('');
  } catch {
    return '';
  }
}

let _otpInterval;
function startOTPTimer(seconds) {
  try {
    clearInterval(_otpInterval);
    let s = seconds;
    const el = document.getElementById('otp-timer');
    
    if (!el) return;
    
    _otpInterval = setInterval(() => {
      s--;
      
      if (!document.getElementById('otp-timer')) {
        clearInterval(_otpInterval);
        return;
      }
      
      if (s <= 0) {
        clearInterval(_otpInterval);
        const parent = document.getElementById('otp-timer')?.parentElement;
        if (parent) {
          parent.innerHTML = `<a href="#" onclick="resendOTP();return false" style="color:var(--primary);font-weight:600;font-size:13px">Resend OTP</a>`;
        }
      } else {
        const timerEl = document.getElementById('otp-timer');
        if (timerEl) timerEl.textContent = `${s}s`;
      }
    }, 1000);
  } catch (err) {
    console.error('OTP timer error:', err);
  }
}

// ═══════════════════════════════════════════════
// NAVBAR BUILDER
// ═══════════════════════════════════════════════
function buildNavbar(active) {
  try {
    const user = Auth.user();
    const cartCount = Cart.count();

    // TOP NAVBAR
    const navbar = document.querySelector('.navbar .container');
    if (navbar) {
      const userName = escapeHtml(user?.name?.split(' ')[0] || 'User');
      const userInitial = escapeHtml(user?.name?.charAt(0)?.toUpperCase() || 'U');

      navbar.innerHTML = `
        <a href="index.html" class="nav-logo">india<span>Shop</span></a>
        <div class="nav-search-wrap">
          <form class="nav-search" onsubmit="doSearch(event)">
            <input type="text" id="nav-search-input" placeholder="Search products, brands and more..." autocomplete="off">
            <button type="submit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>
        </div>
        <div class="nav-actions">
          ${user
            ? `<div class="nav-user-chip" onclick="window.location='account.html'" style="cursor:pointer;">
                 <div class="nav-avatar">${userInitial}</div>
                 <span class="nav-username">${userName}</span>
               </div>`
            : `<a href="login.html" class="btn btn-outline btn-sm">Login</a>`
          }
          <a href="cart.html" class="nav-cart-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            <span class="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
          </a>
        </div>`;
    }

    // BOTTOM NAV
    const bottom = document.querySelector('.bottom-nav');
    if (bottom) {
      const items = [
        { id: 'home',     label: 'Home',    href: 'index.html',    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
        { id: 'products', label: 'Shop',    href: 'products.html', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>` },
        { id: 'cart',     label: 'Cart',    href: 'cart.html',     icon: `<span style="position:relative"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg><span class="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span></span>` },
        { id: 'account',  label: 'Account', href: 'account.html',  icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
      ];
      
      bottom.innerHTML = items.map(item => `
        <a href="${item.href}" class="bottom-nav-item${active === item.id ? ' active' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </a>`).join('');
    }

    updateCartBadge();
  } catch (err) {
    console.error('Navbar building error:', err);
  }
}

function doSearch(e) {
  try {
    e.preventDefault();
    const q = document.getElementById('nav-search-input')?.value?.trim();
    if (!q) {
      toast('Please enter a search term', 'error');
      return;
    }
    window.location.href = `products.html?q=${encodeURIComponent(q)}`;
  } catch (err) {
    console.error('Search error:', err);
    toast('Search failed', 'error');
  }
}

// ═══════════════════════════════════════════════
// CSS INJECTION (animations)
// ═══════════════════════════════════════════════
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes slideUp { 
    from { opacity:0; transform:translateY(10px); } 
    to { opacity:1; transform:translateY(0); } 
  }
  .spinner { 
    display:inline-block;
    width:16px;
    height:16px;
    border:2px solid rgba(255,255,255,0.4);
    border-top-color:#fff;
    border-radius:50%;
    animation:spin 0.7s linear infinite; 
  }
  @keyframes spin { 
    to { transform:rotate(360deg); } 
  }
`;
document.head.appendChild(styleEl);

// ═══════════════════════════════════════════════
// PAGE LOAD CHECK
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  try {
    const token = Auth.token();
    const currentPage = window.location.pathname;
    
    // Protected pages
    const protectedPages = ['account.html', 'cart.html', 'checkout.html'];
    const isProtected = protectedPages.some(page => currentPage.includes(page));
    
    if (isProtected && !token) {
      window.location.href = 'login.html';
    }
  } catch (err) {
    console.error('Page load check error:', err);
  }
});
