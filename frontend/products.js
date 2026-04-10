import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("products");

const productsList = document.getElementById("productsList");
const statusEl = document.getElementById("status");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const categoryChips = document.getElementById("categoryChips");
const resultCount = document.getElementById("resultCount");
const loadingProducts = document.getElementById("loadingProducts");
const emptyProducts = document.getElementById("emptyProducts");

let selectedCategoryId = null;

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
        await loadCategories();
        await loadProducts();
      });
    });
  } catch (_) {
    // Categories are an enhancement; product list can still work without them.
  }
}

async function loadProducts() {
  if (!user) return;
  loadingProducts.style.display = "block";
  emptyProducts.style.display = "none";
  productsList.innerHTML = "";
  const search = document.getElementById("searchInput").value.trim();
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
    const products = data.products || [];
    resultCount.textContent = `${products.length} products`;
    productsList.innerHTML = products
      .map(
        (product) => `
        <article class="product-card">
          <div class="product-head">
            <span class="pill">${product.category_name}</span>
            ${productStockBadge(product.stock_qty, product.reorder_level)}
          </div>
          <h3>${product.product_name}</h3>
          <p class="muted">${product.description || "No description"}</p>
          <div class="meta-grid">
            <p><strong>SKU:</strong> ${product.sku}</p>
            <p><strong>Price:</strong> ₹${Number(product.price).toFixed(2)}</p>
            <p><strong>Stock:</strong> ${product.stock_qty}</p>
          </div>
          <div class="row">
            <input type="number" min="1" max="${product.stock_qty}" value="1" id="qty-${product.product_id}" ${product.stock_qty <= 0 ? "disabled" : ""} />
            <button class="inline" data-product-id="${product.product_id}" ${product.stock_qty <= 0 ? "disabled" : ""}>Add to Cart</button>
          </div>
        </article>
      `,
      )
      .join("");

    if (!products.length) {
      emptyProducts.style.display = "block";
    }

    productsList.querySelectorAll("button[data-product-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productId = Number(btn.dataset.productId);
        const qty = Number(document.getElementById(`qty-${productId}`).value || 1);
        await addToCart(productId, qty);
      });
    });
    loadingProducts.style.display = "none";
  } catch (error) {
    loadingProducts.style.display = "none";
    showStatus(statusEl, error.message, "error");
  }
}

async function addToCart(productId, quantity) {
  try {
    await apiFetch("/cart/items", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        quantity,
      }),
    });
    showStatus(statusEl, "Item added to cart.", "success");
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

searchBtn?.addEventListener("click", loadProducts);
clearBtn?.addEventListener("click", async () => {
  selectedCategoryId = null;
  document.getElementById("searchInput").value = "";
  document.getElementById("stockOnlyInput").checked = false;
  document.getElementById("sortInput").value = "name_asc";
  document.getElementById("minPriceInput").value = "";
  document.getElementById("maxPriceInput").value = "";
  await loadCategories();
  await loadProducts();
});

await loadCategories();
await loadProducts();
