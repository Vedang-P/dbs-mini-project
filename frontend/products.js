import { apiFetch, requireActiveUser } from "./api.js";
import { initRevealAnimations, renderFooter, renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("products");
renderFooter();

const productsList = document.getElementById("productsList");
const statusEl = document.getElementById("status");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const categoryChips = document.getElementById("categoryChips");
const resultCount = document.getElementById("resultCount");
const loadingProducts = document.getElementById("loadingProducts");
const emptyProducts = document.getElementById("emptyProducts");
const ratingFilter = document.getElementById("ratingFilter");
const searchInlineInput = document.getElementById("searchInlineInput");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageIndicator = document.getElementById("pageIndicator");

let selectedCategoryId = null;
let selectedMinRating = null;
let currentPage = 1;
const PAGE_SIZE = 9;
let filteredProducts = [];

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

function productStockBadge(stockQty, reorderLevel) {
  if (stockQty <= 0) return `<span class="pill danger">Out of stock</span>`;
  if (stockQty <= reorderLevel) return `<span class="pill warning">Low stock</span>`;
  return `<span class="pill success">In stock</span>`;
}

async function loadCategories() {
  try {
    const data = await apiFetch("/categories");
    const categories = data.categories || [];
    categoryChips.innerHTML = [
      `<button class="chip ${selectedCategoryId === null ? "active" : ""}" data-category-id="">All</button>`,
      ...categories.map(
        (cat) =>
          `<button class="chip ${selectedCategoryId === cat.category_id ? "active" : ""}" data-category-id="${cat.category_id}">${cat.category_name}</button>`,
      ),
    ].join("");

    categoryChips.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", async () => {
        const rawCategoryId = chip.dataset.categoryId;
        selectedCategoryId = rawCategoryId ? Number(rawCategoryId) : null;
        currentPage = 1;
        await loadCategories();
        await loadProducts();
      });
    });
  } catch (_) {
    // Categories are optional enhancement.
  }
}

function renderPageSlice() {
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredProducts.slice(start, start + PAGE_SIZE);

  resultCount.textContent = `${filteredProducts.length} products`;
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= totalPages;

  productsList.innerHTML = pageItems
    .map((product) => {
      const rating = ratingForProduct(product.product_id);
      return `
        <article class="product-card">
          <div class="product-media">
            <button class="wish-btn" aria-label="Wishlist ${product.product_name}">♡</button>
            <div class="product-thumb">${initialsFromName(product.product_name)}</div>
            <button class="btn btn-primary quick-add" data-product-id="${product.product_id}" ${product.stock_qty <= 0 ? "disabled" : ""}>Quick Add</button>
          </div>
          <div class="product-body">
            <div class="product-row">
              <strong>${product.product_name}</strong>
              ${productStockBadge(product.stock_qty, product.reorder_level)}
            </div>
            <div class="product-row">
              <span class="stars" aria-label="${rating.toFixed(1)} stars">${starRow(rating)}</span>
              <span class="muted">${rating.toFixed(1)}</span>
            </div>
            <p class="muted">${product.description || "No description available."}</p>
            <div class="product-row">
              <strong>₹${Number(product.price).toFixed(2)}</strong>
              <a class="muted" href="product.html?id=${product.product_id}">View details</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (!pageItems.length) {
    emptyProducts.style.display = "block";
    return;
  }
  emptyProducts.style.display = "none";

  productsList.querySelectorAll("button[data-product-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productId = Number(btn.dataset.productId);
      try {
        await apiFetch("/cart/items", {
          method: "POST",
          body: JSON.stringify({ product_id: productId, quantity: 1 }),
        });
        showStatus(statusEl, "Item added to cart.", "success");
      } catch (error) {
        showStatus(statusEl, error.message, "error");
      }
    });
  });
}

async function loadProducts() {
  if (!user) return;
  loadingProducts.style.display = "grid";
  productsList.innerHTML = "";
  emptyProducts.style.display = "none";

  const searchA = document.getElementById("searchInput").value.trim();
  const searchB = searchInlineInput.value.trim();
  const search = searchB || searchA;
  const inStockOnly = document.getElementById("stockOnlyInput").checked;
  const sort = document.getElementById("sortInput").value;
  const minPrice = document.getElementById("minPriceInput").value;
  const maxPrice = document.getElementById("maxPriceInput").value;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (inStockOnly) params.set("in_stock_only", "true");
  if (selectedCategoryId) params.set("category_id", String(selectedCategoryId));
  if (sort) params.set("sort", sort);
  if (minPrice) params.set("min_price", minPrice);
  if (maxPrice) params.set("max_price", maxPrice);

  try {
    const data = await apiFetch(`/products?${params.toString()}`);
    let products = data.products || [];

    if (selectedMinRating) {
      products = products.filter((product) => ratingForProduct(product.product_id) >= selectedMinRating);
    }

    filteredProducts = products;
    loadingProducts.style.display = "none";
    renderPageSlice();
    initRevealAnimations();
  } catch (error) {
    loadingProducts.style.display = "none";
    showStatus(statusEl, error.message, "error");
  }
}

ratingFilter.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", async () => {
    ratingFilter.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    selectedMinRating = chip.dataset.rating ? Number(chip.dataset.rating) : null;
    currentPage = 1;
    await loadProducts();
  });
});

searchBtn?.addEventListener("click", async () => {
  currentPage = 1;
  await loadProducts();
});

searchInlineInput?.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  currentPage = 1;
  await loadProducts();
});

clearBtn?.addEventListener("click", async () => {
  selectedCategoryId = null;
  selectedMinRating = null;
  currentPage = 1;
  document.getElementById("searchInput").value = "";
  searchInlineInput.value = "";
  document.getElementById("stockOnlyInput").checked = false;
  document.getElementById("sortInput").value = "name_asc";
  document.getElementById("minPriceInput").value = "";
  document.getElementById("maxPriceInput").value = "";
  ratingFilter.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
  ratingFilter.querySelector('[data-rating=""]').classList.add("active");
  await loadCategories();
  await loadProducts();
});

prevPageBtn?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderPageSlice();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextPageBtn?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  if (currentPage < totalPages) {
    currentPage += 1;
    renderPageSlice();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

await loadCategories();
await loadProducts();
