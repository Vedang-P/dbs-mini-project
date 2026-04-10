import { apiFetch, clearActiveUser, getActiveUser, getAuthToken } from "./api.js";

function userInitial(name = "U") {
  const trimmed = String(name || "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}

function icon(name) {
  const icons = {
    search: "⌕",
    cart: "🛒",
    menu: "☰",
    close: "✕",
  };
  return icons[name] || "•";
}

function renderDrawerLinks(activePage, user) {
  const links = [
    ["index.html", "Home", "home"],
    ["products.html", "Products", "products"],
    ["cart.html", "Cart", "cart"],
    ["checkout.html", "Checkout", "checkout"],
    ["orders.html", "Orders", "orders"],
  ];
  if (user?.is_admin) {
    links.push(["admin.html", "Admin", "admin"]);
  }

  return links
    .map(([href, label, key]) => {
      const active = key === activePage ? "nav-link active" : "nav-link";
      return `<a class="${active}" href="${href}">${label}</a>`;
    })
    .join("");
}

async function updateCartBadge() {
  const cartBadge = document.getElementById("cartCountBadge");
  if (!cartBadge) return;
  if (!getAuthToken()) {
    cartBadge.textContent = "0";
    return;
  }
  try {
    const cart = await apiFetch("/cart");
    cartBadge.textContent = String(cart?.item_count ?? 0);
  } catch (_) {
    cartBadge.textContent = "0";
  }
}

function bindDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const openBtn = document.getElementById("openDrawerBtn");
  const closeBtn = document.getElementById("closeDrawerBtn");
  const backdrop = document.getElementById("drawerBackdrop");
  if (!drawer || !openBtn || !closeBtn || !backdrop) return;

  const close = () => drawer.classList.remove("open");
  const open = () => drawer.classList.add("open");

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
}

function bindLogout() {
  const logoutButtons = Array.from(document.querySelectorAll("[data-logout='true']"));
  if (!logoutButtons.length) return;

  logoutButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiFetch("/auth/logout", { method: "POST" });
      } catch (_) {
        // Clear local state even if revoke request fails.
      }
      clearActiveUser();
      window.location.href = "login.html";
    });
  });
}

export function renderNavbar(activePage = "home") {
  const user = getActiveUser();
  const root = document.getElementById("navbar");
  if (!root) return;

  const links = [
    ["index.html", "Home", "home"],
    ["products.html", "Products", "products"],
    ["cart.html", "Cart", "cart"],
    ["orders.html", "Orders", "orders"],
  ];
  if (user?.is_admin) {
    links.push(["admin.html", "Admin", "admin"]);
  }

  const linksHtml = links
    .map(([href, label, key]) => {
      const active = key === activePage ? "nav-link active" : "nav-link";
      return `<a class="${active}" href="${href}">${label}</a>`;
    })
    .join("");

  const accountChunk = user
    ? `
      <span class="avatar-chip">
        <span class="avatar-dot">${userInitial(user.name)}</span>
        <span class="muted">${user.name}${user.is_admin ? " · Admin" : ""}</span>
      </span>
      <button class="btn btn-ghost" data-logout="true">Logout</button>
    `
    : `
      <a class="btn btn-ghost" href="login.html">Login</a>
      <a class="btn btn-primary" href="signup.html">Sign Up</a>
    `;

  root.className = "site-header";
  root.innerHTML = `
    <div class="navbar-shell">
      <div class="navbar-inner">
        <a href="index.html" class="brand" aria-label="DBMS Cart home">
          <span class="brand-badge">DB</span>
          <span>DBMS Cart</span>
        </a>
        <nav class="nav-links" aria-label="Main navigation">
          ${linksHtml}
        </nav>
        <div class="nav-tools">
          <a class="icon-btn search-btn" href="products.html" aria-label="Search products">${icon("search")}</a>
          <a class="icon-btn" href="cart.html" aria-label="Open cart">${icon("cart")}<span class="badge" id="cartCountBadge">0</span></a>
          ${accountChunk}
          <button class="icon-btn hamburger" id="openDrawerBtn" aria-label="Open menu">${icon("menu")}</button>
        </div>
      </div>
    </div>
    <div class="mobile-drawer" id="mobileDrawer" aria-hidden="true">
      <div class="drawer-backdrop" id="drawerBackdrop"></div>
      <aside class="drawer-panel">
        <button class="icon-btn" id="closeDrawerBtn" aria-label="Close menu">${icon("close")}</button>
        <div style="margin: 10px 0 8px" class="muted">${user ? `${user.name}${user.is_admin ? " (Admin)" : ""}` : "Guest"}</div>
        ${renderDrawerLinks(activePage, user)}
        ${user ? `<button class="btn btn-ghost" data-logout="true">Logout</button>` : `<a class="btn btn-primary" href="login.html">Login</a>`}
      </aside>
    </div>
  `;

  bindDrawer();
  bindLogout();
  updateCartBadge();
}

export function renderFooter() {
  const root = document.getElementById("footer");
  if (!root) return;

  root.className = "footer";
  root.innerHTML = `
    <div class="footer-inner">
      <div class="footer-grid">
        <section>
          <h4>DBMS Cart</h4>
          <p class="muted">Premium storefront experience powered by a transaction-safe PostgreSQL backend.</p>
          <div class="socials" style="margin-top:10px">
            <span>in</span><span>X</span><span>ig</span>
          </div>
        </section>
        <section>
          <h4>Quick Links</h4>
          <ul class="footer-list">
            <li><a href="index.html">Home</a></li>
            <li><a href="products.html">Catalog</a></li>
            <li><a href="cart.html">Cart</a></li>
            <li><a href="orders.html">Orders</a></li>
          </ul>
        </section>
        <section>
          <h4>Customer Care</h4>
          <ul class="footer-list">
            <li>Shipping & Delivery</li>
            <li>Returns & Refunds</li>
            <li>Secure Checkout</li>
            <li>24x7 Support</li>
          </ul>
        </section>
        <section>
          <h4>Contact</h4>
          <ul class="footer-list">
            <li>support@dbmscart.store</li>
            <li>+91 98765 43210</li>
            <li>Mumbai, India</li>
          </ul>
          <div class="payment-chips" style="margin-top:10px">
            <span class="payment-chip">VISA</span>
            <span class="payment-chip">UPI</span>
            <span class="payment-chip">AMEX</span>
            <span class="payment-chip">RUPAY</span>
          </div>
        </section>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} DBMS Cart. Crafted for production-grade demos.</span>
        <span class="muted">FastAPI · PostgreSQL · Vercel</span>
      </div>
    </div>
  `;
}

export function initRevealAnimations() {
  const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!nodes.length) return;

  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  nodes.forEach((node) => observer.observe(node));
}

export function showStatus(el, message, type = "success") {
  if (!el) return;
  el.innerHTML = `<div class="status ${type}">${message}</div>`;
}
