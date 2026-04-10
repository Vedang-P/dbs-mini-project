import { clearActiveUser, getActiveUser } from "./api.js";

export function renderNavbar(activePage) {
  const user = getActiveUser();
  const root = document.getElementById("navbar");
  if (!root) return;

  const links = [
    ["products.html", "Products", "products"],
    ["cart.html", "Cart", "cart"],
    ["checkout.html", "Checkout", "checkout"],
    ["orders.html", "Orders", "orders"],
  ];

  const linksHtml = links
    .map(([href, label, key]) => {
      const bold = key === activePage ? "style='font-weight:700'" : "";
      return `<a ${bold} href="${href}">${label}</a>`;
    })
    .join("");

  root.innerHTML = `
    <div class="navbar-inner">
      <div>
        <strong>DBMS Cart</strong>
      </div>
      <div class="nav-links">
        ${linksHtml}
      </div>
      <div class="nav-links">
        <span class="muted">${user ? `User #${user.user_id}` : "Guest"}</span>
        <button class="inline secondary" id="logoutBtn">Logout</button>
      </div>
    </div>
  `;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearActiveUser();
      window.location.href = "login.html";
    });
  }
}

export function showStatus(el, message, type = "success") {
  if (!el) return;
  el.innerHTML = `<div class="status ${type}">${message}</div>`;
}
