import { apiFetch, getActiveUser } from "./api.js";
import { initRevealAnimations, renderFooter, renderNavbar, showStatus } from "./ui.js";

renderNavbar("products");
renderFooter();

const productStatusEl = document.getElementById("productStatus");
const productLoadingEl = document.getElementById("productLoading");
const productDetailWrapEl = document.getElementById("productDetailWrap");
const relatedProductsEl = document.getElementById("relatedProducts");
const tabPanel = document.getElementById("tabPanel");
const tabHeader = document.getElementById("tabHeader");
const productQtyInput = document.getElementById("productQty");
const addToCartBtn = document.getElementById("addToCartBtn");
const wishlistBtn = document.getElementById("wishlistBtn");

const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id") || 0);

const tabContent = {
  description: "Crafted with premium materials and optimized for all-day comfort and durability. Designed for modern, everyday use.",
  reviews: "★ ★ ★ ★ ☆ 4.4 average rating from verified shoppers. Fast delivery and quality finish are the most loved highlights.",
  shipping: "Ships in 24-48 hours. Standard delivery in 3-5 business days. Easy cancellation and returns available.",
};

function initialsFromName(name = "P") {
  return String(name)
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ratingForProduct(id) {
  return 3.8 + ((id * 37) % 12) / 10;
}

function starRow(rating) {
  const rounded = Math.round(rating);
  return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
}

function renderSelectorButtons(targetId, items) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = items.map((value, idx) => `<button class="selector ${idx === 0 ? "active" : ""}">${value}</button>`).join("");
  target.querySelectorAll(".selector").forEach((button) => {
    button.addEventListener("click", () => {
      target.querySelectorAll(".selector").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

function renderThumbs(productName) {
  const grid = document.getElementById("thumbGrid");
  if (!grid) return;
  grid.innerHTML = [1, 2, 3, 4]
    .map((idx) => `<button class="thumb" data-thumb="${idx}" aria-label="Image ${idx}">${initialsFromName(productName)}${idx}</button>`)
    .join("");
  const mainThumb = document.getElementById("mainThumb");
  grid.querySelectorAll(".thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainThumb.textContent = thumb.textContent;
    });
  });
}

function renderTab(tabKey) {
  tabPanel.textContent = tabContent[tabKey] || tabContent.description;
  tabHeader.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabKey);
  });
}

function renderRelated(products, currentProduct) {
  const related = products.filter((product) => product.product_id !== currentProduct.product_id).slice(0, 3);
  relatedProductsEl.innerHTML = related
    .map((product) => {
      const rating = ratingForProduct(product.product_id);
      return `
        <article class="product-card">
          <div class="product-media">
            <div class="product-thumb">${initialsFromName(product.product_name)}</div>
          </div>
          <div class="product-body">
            <strong>${product.product_name}</strong>
            <div class="product-row">
              <span class="stars">${starRow(rating)}</span>
              <span class="muted">${rating.toFixed(1)}</span>
            </div>
            <div class="product-row">
              <strong>₹${Number(product.price).toFixed(2)}</strong>
              <a class="muted" href="product.html?id=${product.product_id}">View</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function initializeProductPage() {
  if (!productId) {
    showStatus(productStatusEl, "Invalid product selected.", "error");
    productLoadingEl.style.display = "none";
    return;
  }

  try {
    const data = await apiFetch("/products");
    const products = data.products || [];
    const product = products.find((item) => item.product_id === productId);

    if (!product) {
      showStatus(productStatusEl, "Product not found.", "error");
      productLoadingEl.style.display = "none";
      return;
    }

    const rating = ratingForProduct(product.product_id);
    document.getElementById("productCategoryPill").textContent = product.category_name;
    document.getElementById("productName").textContent = product.product_name;
    document.getElementById("productPrice").textContent = `₹${Number(product.price).toFixed(2)}`;
    document.getElementById("productStars").textContent = `${starRow(rating)} ${rating.toFixed(1)}`;
    document.getElementById("productDescription").textContent =
      product.description || "This premium product is crafted for comfort, utility, and timeless styling.";
    document.getElementById("mainThumb").textContent = initialsFromName(product.product_name);

    renderThumbs(product.product_name);
    renderSelectorButtons("sizeSelectors", ["S", "M", "L", "XL"]);
    renderSelectorButtons("colorSelectors", ["Midnight", "Ivory", "Olive"]);
    renderTab("description");
    renderRelated(products.filter((item) => item.category_id === product.category_id), product);

    tabHeader.querySelectorAll(".tab-btn").forEach((button) => {
      button.addEventListener("click", () => renderTab(button.dataset.tab));
    });

    addToCartBtn.addEventListener("click", async () => {
      const user = getActiveUser();
      if (!user?.user_id) {
        window.location.href = "login.html";
        return;
      }

      const quantity = Number(productQtyInput.value || 1);
      if (quantity < 1) {
        showStatus(productStatusEl, "Quantity must be at least 1.", "error");
        return;
      }

      try {
        await apiFetch("/cart/items", {
          method: "POST",
          body: JSON.stringify({
            product_id: product.product_id,
            quantity,
          }),
        });
        showStatus(productStatusEl, "Added to cart successfully.", "success");
      } catch (error) {
        showStatus(productStatusEl, error.message, "error");
      }
    });

    wishlistBtn.addEventListener("click", () => {
      showStatus(productStatusEl, "Wishlist is visual-only for this demo build.", "success");
    });

    productLoadingEl.style.display = "none";
    productDetailWrapEl.style.display = "block";
    initRevealAnimations();
  } catch (error) {
    productLoadingEl.style.display = "none";
    showStatus(productStatusEl, error.message, "error");
  }
}

await initializeProductPage();
