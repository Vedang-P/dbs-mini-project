import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("cart");

const statusEl = document.getElementById("status");
const cartItemsEl = document.getElementById("cartItems");
const totalAmountEl = document.getElementById("totalAmount");
const loadingCartEl = document.getElementById("loadingCart");

async function loadCart() {
  if (!user) return;
  loadingCartEl.style.display = "block";
  cartItemsEl.innerHTML = "";
  try {
    const cart = await apiFetch("/cart");
    const items = cart.items || [];

    cartItemsEl.innerHTML = items
      .map(
        (item) => `
        <article class="cart-item">
          <div class="cart-item-top">
            <strong>${item.product_name}</strong>
            <span class="muted">${item.sku}</span>
          </div>
          <div class="cart-item-meta">
            <span>Unit: ₹${Number(item.price).toFixed(2)}</span>
            <span>Stock: ${item.stock_qty}</span>
            <span>Line: ₹${Number(item.line_total).toFixed(2)}</span>
          </div>
          <div class="cart-actions">
            <input id="cart-qty-${item.cart_item_id}" type="number" min="1" max="${item.stock_qty}" value="${item.quantity}" />
            <button class="inline" data-action="update" data-cart-item-id="${item.cart_item_id}">Update</button>
            <button class="inline danger" data-action="remove" data-cart-item-id="${item.cart_item_id}">Remove</button>
          </div>
        </article>
      `,
      )
      .join("");

    if (!items.length) {
      cartItemsEl.innerHTML = "<p class='muted'>Your cart is currently empty.</p>";
    }

    totalAmountEl.textContent = `Cart Total: ₹${Number(cart.total_amount || 0).toFixed(2)}`;

    cartItemsEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cartItemId = Number(btn.dataset.cartItemId);
        const action = btn.dataset.action;
        if (action === "remove") {
          await removeItem(cartItemId);
          return;
        }

        const qtyInput = document.getElementById(`cart-qty-${cartItemId}`);
        const quantity = Number(qtyInput?.value || 1);
        await updateItem(cartItemId, quantity);
      });
    });
    loadingCartEl.style.display = "none";
  } catch (error) {
    loadingCartEl.style.display = "none";
    showStatus(statusEl, error.message, "error");
  }
}

async function updateItem(cartItemId, quantity) {
  try {
    await apiFetch(`/cart/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    showStatus(statusEl, "Cart updated.", "success");
    await loadCart();
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

async function removeItem(cartItemId) {
  try {
    await apiFetch(`/cart/items/${cartItemId}`, {
      method: "DELETE",
    });
    showStatus(statusEl, "Item removed from cart.", "success");
    await loadCart();
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

await loadCart();
