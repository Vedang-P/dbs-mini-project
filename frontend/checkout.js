import { apiFetch, requireActiveUser } from "./api.js";
import { initRevealAnimations, renderFooter, renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("checkout");
renderFooter();
initRevealAnimations();

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("checkoutSummary");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const loadingCheckoutEl = document.getElementById("loadingCheckout");

async function loadSummary() {
  if (!user) return;
  loadingCheckoutEl.style.display = "grid";
  summaryEl.innerHTML = "";
  try {
    const cart = await apiFetch("/cart");
    const items = cart.items || [];
    if (!items.length) {
      summaryEl.innerHTML = "<div class='empty-state'>Cart is empty. Add items from the products page first.</div>";
      placeOrderBtn.disabled = true;
      loadingCheckoutEl.style.display = "none";
      return;
    }

    summaryEl.innerHTML = `
      <div class="summary-box">
        <h3>Order Summary (${cart.item_count} items)</h3>
        <ul class="summary-list" style="margin-top:12px">
          ${items
            .map(
              (item) => `
                <li>
                  <span>${item.product_name} × ${item.quantity}</span>
                  <strong>₹${Number(item.line_total).toFixed(2)}</strong>
                </li>
              `,
            )
            .join("")}
        </ul>
        <div class="divider"></div>
        <div class="product-row">
          <strong>Total</strong>
          <strong>₹${Number(cart.total_amount).toFixed(2)}</strong>
        </div>
      </div>
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
  placeOrderBtn.textContent = "Placing Order...";
  try {
    const result = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({}),
    });
    showStatus(statusEl, `Order placed successfully. Order ID: ${result.order_id}`, "success");
    setTimeout(() => {
      window.location.href = "orders.html";
    }, 900);
  } catch (error) {
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    showStatus(statusEl, error.message, "error");
  }
});

await loadSummary();
