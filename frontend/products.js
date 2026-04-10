import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("products");

const productsList = document.getElementById("productsList");
const statusEl = document.getElementById("status");
const searchBtn = document.getElementById("searchBtn");

async function loadProducts() {
  if (!user) return;

  const search = document.getElementById("searchInput").value.trim();
  const inStockOnly = document.getElementById("stockOnlyInput").checked;
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (inStockOnly) params.set("in_stock_only", "true");

  try {
    const data = await apiFetch(`/products?${params.toString()}`);
    const products = data.products || [];
    productsList.innerHTML = products
      .map(
        (product) => `
        <article class="product-card">
          <div class="pill">${product.category_name}</div>
          <h3>${product.product_name}</h3>
          <p class="muted">${product.description || "No description"}</p>
          <p><strong>SKU:</strong> ${product.sku}</p>
          <p><strong>Price:</strong> ₹${Number(product.price).toFixed(2)}</p>
          <p><strong>Stock:</strong> ${product.stock_qty}</p>
          <div class="row">
            <input type="number" min="1" value="1" id="qty-${product.product_id}" />
            <button class="inline" data-product-id="${product.product_id}">Add To Cart</button>
          </div>
        </article>
      `,
      )
      .join("");

    if (!products.length) {
      productsList.innerHTML = "<p class='muted'>No products match current filters.</p>";
    }

    productsList.querySelectorAll("button[data-product-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productId = Number(btn.dataset.productId);
        const qty = Number(document.getElementById(`qty-${productId}`).value || 1);
        await addToCart(productId, qty);
      });
    });
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

async function addToCart(productId, quantity) {
  try {
    await apiFetch("/cart", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.user_id,
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
loadProducts();
