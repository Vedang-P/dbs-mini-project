import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("checkout");

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("checkoutSummary");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const loadingCheckoutEl = document.getElementById("loadingCheckout");

async function loadSummary() {
  if (!user) return;
  loadingCheckoutEl.style.display = "block";
  summaryEl.innerHTML = "";
  try {
    const cart = await apiFetch("/cart");
    const items = cart.items || [];
    if (!items.length) {
      summaryEl.innerHTML = "<p class='muted'>Cart is empty. Add items from the products page first.</p>";
      placeOrderBtn.disabled = true;
      loadingCheckoutEl.style.display = "none";
      return;
    }

    summaryEl.innerHTML = `
      <h3>Order Summary (${cart.item_count} items)</h3>
      ${items
        .map(
          (item) => `
            <div class="cart-item">
              <strong>${item.product_name}</strong><br/>
              Qty: ${item.quantity} | Unit: ₹${Number(item.price).toFixed(2)} | Line Total: ₹${Number(item.line_total).toFixed(2)}
            </div>
          `,
        )
        .join("")}
      <h3>Total: ₹${Number(cart.total_amount).toFixed(2)}</h3>
    `;
    placeOrderBtn.disabled = false;
    loadingCheckoutEl.style.display = "none";
  } catch (error) {
    loadingCheckoutEl.style.display = "none";
    showStatus(statusEl, error.message, "error");
  }
}

placeOrderBtn?.addEventListener("click", async () => {
  placeOrderBtn.disabled = true;
  try {
    const result = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({}),
    });
    showStatus(statusEl, `Order placed successfully. Order ID: ${result.order_id}`, "success");
    setTimeout(() => {
      window.location.href = "orders.html";
    }, 700);
  } catch (error) {
    placeOrderBtn.disabled = false;
    showStatus(statusEl, error.message, "error");
  }
});

await loadSummary();
