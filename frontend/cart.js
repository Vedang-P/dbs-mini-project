import { apiFetch, requireActiveUser } from "./api.js";
import { initRevealAnimations, renderFooter, renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("cart");
renderFooter();
initRevealAnimations();

const statusEl = document.getElementById("status");
const cartItemsEl = document.getElementById("cartItems");
const totalAmountEl = document.getElementById("totalAmount");
const loadingCartEl = document.getElementById("loadingCart");

async function loadCart() {
  if (!user) return;
  loadingCartEl.style.display = "grid";
  cartItemsEl.innerHTML = "";
  try {
    const cart = await apiFetch("/cart");
    const items = cart.items || [];

    cartItemsEl.innerHTML = items
      .map(
        (item) => `
        <article class="cart-item">
          <div class="cart-row">
            <strong>${item.product_name}</strong>
            <span class="pill">${item.sku}</span>
          </div>
          <div class="cart-meta">
            <span>Unit: ₹${Number(item.price).toFixed(2)}</span>
            <span>Stock: ${item.stock_qty}</span>
            <span>Line Total: ₹${Number(item.line_total).toFixed(2)}</span>
          </div>
          <div class="cart-row" style="margin-top:12px">
            <div class="qty-stepper">
              <button data-action="decrease" data-cart-item-id="${item.cart_item_id}" aria-label="Decrease quantity">−</button>
              <input id="cart-qty-${item.cart_item_id}" type="number" min="1" max="${item.stock_qty}" value="${item.quantity}" />
              <button data-action="increase" data-cart-item-id="${item.cart_item_id}" aria-label="Increase quantity">+</button>
            </div>
            <div class="quick-links">
              <button class="btn btn-ghost" data-action="update" data-cart-item-id="${item.cart_item_id}">Update</button>
              <button class="btn btn-danger" data-action="remove" data-cart-item-id="${item.cart_item_id}">Remove</button>
            </div>
          </div>
        </article>
      `,
      )
      .join("");

    if (!items.length) {
      cartItemsEl.innerHTML = "<div class='empty-state'>Your cart is currently empty.</div>";
    }

    totalAmountEl.textContent = `Cart Total: ₹${Number(cart.total_amount || 0).toFixed(2)}`;

    cartItemsEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cartItemId = Number(btn.dataset.cartItemId);
        const action = btn.dataset.action;
        const qtyInput = document.getElementById(`cart-qty-${cartItemId}`);
        const currentQty = Number(qtyInput?.value || 1);

        if (action === "increase") {
          qtyInput.value = String(currentQty + 1);
          return;
        }
        if (action === "decrease") {
          qtyInput.value = String(Math.max(1, currentQty - 1));
          return;
        }
        if (action === "remove") {
          await removeItem(cartItemId);
          return;
        }
        await updateItem(cartItemId, Number(qtyInput?.value || 1));
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
