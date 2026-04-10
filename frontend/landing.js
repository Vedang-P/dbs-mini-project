import { apiFetch, getActiveUser } from "./api.js";
import { initRevealAnimations, renderFooter, renderNavbar, showStatus } from "./ui.js";

renderNavbar("home");
renderFooter();
initRevealAnimations();

const featuredProductsEl = document.getElementById("featuredProducts");
const categoryChipsEl = document.getElementById("landingCategoryChips");
const newsletterForm = document.getElementById("newsletterForm");
const newsletterStatus = document.getElementById("newsletterStatus");

function initialsFromName(name = "P") {
  return String(name)
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ratingForProduct(productId) {
  return 3.8 + ((productId * 37) % 12) / 10;
}

function starRow(rating) {
  const rounded = Math.round(rating);
  return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
}

function renderProductCard(product, userLoggedIn) {
  const rating = ratingForProduct(product.product_id);
  return `
    <article class="product-card" data-reveal>
      <div class="product-media">
        <button class="wish-btn" aria-label="Add ${product.product_name} to wishlist">♡</button>
        <div class="product-thumb">${initialsFromName(product.product_name)}</div>
        <button class="btn btn-primary quick-add" data-product-id="${product.product_id}">
          ${userLoggedIn ? "Add to cart" : "Login to add"}
        </button>
      </div>
      <div class="product-body">
        <div class="product-row">
          <strong>${product.product_name}</strong>
          <span class="pill">${product.category_name}</span>
        </div>
        <div class="product-row">
          <span class="stars" aria-label="${rating.toFixed(1)} stars">${starRow(rating)}</span>
          <span class="muted">${rating.toFixed(1)}</span>
        </div>
        <div class="product-row">
          <strong>₹${Number(product.price).toFixed(2)}</strong>
          <a class="muted" href="product.html?id=${product.product_id}">View</a>
        </div>
      </div>
    </article>
  `;
}

async function loadLandingData() {
  featuredProductsEl.innerHTML = `
    <div class="skeleton sk-card"></div>
    <div class="skeleton sk-card"></div>
    <div class="skeleton sk-card"></div>
  `;

  try {
    const [categoriesData, productsData] = await Promise.all([
      apiFetch("/categories"),
      apiFetch("/products?in_stock_only=true&sort=price_desc"),
    ]);

    const categories = categoriesData?.categories || [];
    const products = (productsData?.products || []).slice(0, 4);
    const user = getActiveUser();

    categoryChipsEl.innerHTML = categories
      .map((category, index) => {
        const iconSet = ["⌚", "📱", "🎧", "🧥", "🏠", "🧴", "💡", "🖥️"];
        return `<a class="chip" href="products.html?category_id=${category.category_id}">${iconSet[index % iconSet.length]} ${category.category_name}</a>`;
      })
      .join("");

    featuredProductsEl.innerHTML = products.map((product) => renderProductCard(product, Boolean(user?.user_id))).join("");

    featuredProductsEl.querySelectorAll("[data-product-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = Number(button.dataset.productId);
        if (!user?.user_id) {
          window.location.href = "login.html";
          return;
        }
        try {
          await apiFetch("/cart/items", {
            method: "POST",
            body: JSON.stringify({ product_id: productId, quantity: 1 }),
          });
          showStatus(newsletterStatus, "Added to cart successfully.", "success");
        } catch (error) {
          showStatus(newsletterStatus, error.message, "error");
        }
      });
    });

    initRevealAnimations();
  } catch (error) {
    featuredProductsEl.innerHTML = `<div class="empty-state">Unable to load featured products right now.</div>`;
    showStatus(newsletterStatus, error.message, "error");
  }
}

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("newsletterEmail").value.trim();
  if (!email.includes("@")) {
    showStatus(newsletterStatus, "Please enter a valid email address.", "error");
    return;
  }
  newsletterForm.reset();
  showStatus(newsletterStatus, "Subscribed. You will receive weekly product drops.", "success");
});

await loadLandingData();
