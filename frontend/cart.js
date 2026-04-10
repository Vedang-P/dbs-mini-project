import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("cart");

const statusEl = document.getElementById("status");
const cartItemsEl = document.getElementById("cartItems");
const totalAmountEl = document.getElementById("totalAmount");

async function loadCart() {
  if (!user) return;
  try {
    const cart = await apiFetch(`/cart?user_id=${user.user_id}`);
    const items = cart.items || [];

    cartItemsEl.innerHTML = items
      .map(
        (item) => `
        <div class="cart-item">
          <strong>${item.product_name}</strong>
          <p>SKU: ${item.sku}</p>
          <p>Qty: ${item.quantity}</p>
          <p>Unit Price: ₹${Number(item.price).toFixed(2)}</p>
          <p>Line Total: ₹${Number(item.line_total).toFixed(2)}</p>
        </div>
      `,
      )
      .join("");

    if (!items.length) {
      cartItemsEl.innerHTML = "<p class='muted'>Your cart is currently empty.</p>";
    }

    totalAmountEl.textContent = `Cart Total: ₹${Number(cart.total_amount || 0).toFixed(2)}`;
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

loadCart();
