import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("checkout");

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("checkoutSummary");
const placeOrderBtn = document.getElementById("placeOrderBtn");

async function loadSummary() {
  if (!user) return;
  try {
    const cart = await apiFetch(`/cart?user_id=${user.user_id}`);
    const items = cart.items || [];
    if (!items.length) {
      summaryEl.innerHTML = "<p class='muted'>Cart is empty. Add items from the products page first.</p>";
      placeOrderBtn.disabled = true;
      return;
    }

    summaryEl.innerHTML = `
      <h3>Order Summary</h3>
      ${items
        .map(
          (item) => `
            <div class="cart-item">
              ${item.product_name} | Qty: ${item.quantity} | Line Total: ₹${Number(item.line_total).toFixed(2)}
            </div>
          `,
        )
        .join("")}
      <h3>Total: ₹${Number(cart.total_amount).toFixed(2)}</h3>
    `;
    placeOrderBtn.disabled = false;
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

placeOrderBtn?.addEventListener("click", async () => {
  try {
    const result = await apiFetch("/order", {
      method: "POST",
      body: JSON.stringify({ user_id: user.user_id }),
    });
    showStatus(statusEl, `Order placed successfully. Order ID: ${result.order_id}`, "success");
    setTimeout(() => {
      window.location.href = "orders.html";
    }, 700);
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
});

loadSummary();
