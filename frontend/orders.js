import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("orders");

const statusEl = document.getElementById("status");
const ordersListEl = document.getElementById("ordersList");
const loadingOrdersEl = document.getElementById("loadingOrders");

function itemRows(items = []) {
  if (!items.length) return "<p class='muted'>No items found for this order.</p>";
  return items
    .map(
      (item) => `
        <div class="order-item">
          <strong>${item.product_name}</strong><br/>
          Qty: ${item.quantity} | Unit: ₹${Number(item.unit_price).toFixed(2)} | Line: ₹${Number(item.line_total).toFixed(2)}
        </div>
      `,
    )
    .join("");
}

async function loadOrders() {
  if (!user) return;
  loadingOrdersEl.style.display = "block";
  ordersListEl.innerHTML = "";
  try {
    const data = await apiFetch("/orders");
    const orders = data.orders || [];

    ordersListEl.innerHTML = orders
      .map(
        (order) => `
          <article class="card" style="margin-bottom: 12px">
            <h3>Order #${order.order_id}</h3>
            <p><strong>Status:</strong> <span class="pill">${order.order_status}</span></p>
            <p><strong>Placed At:</strong> ${new Date(order.placed_at).toLocaleString()}</p>
            <p><strong>Total:</strong> ₹${Number(order.total_amount).toFixed(2)}</p>
            <p><strong>Items:</strong> ${order.item_count || (order.items?.length ?? 0)}</p>
            <div id="order-details-${order.order_id}" style="display:none; margin-top:10px"></div>
            <div class="quick-links">
              <button class="inline secondary order-details-btn" data-order-id="${order.order_id}">View Details</button>
            ${
              order.order_status === "PLACED"
                ? `<button class="danger inline cancel-order-btn" data-order-id="${order.order_id}">Cancel Order</button>`
                : ""
            }
            </div>
          </article>
        `,
      )
      .join("");

    if (!orders.length) {
      ordersListEl.innerHTML = "<p class='muted'>No orders found yet.</p>";
    }

    ordersListEl.querySelectorAll(".order-details-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const orderId = Number(btn.dataset.orderId);
        await toggleOrderDetails(orderId, btn);
      });
    });

    ordersListEl.querySelectorAll(".cancel-order-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await cancelOrder(Number(btn.dataset.orderId));
      });
    });
    loadingOrdersEl.style.display = "none";
  } catch (error) {
    loadingOrdersEl.style.display = "none";
    showStatus(statusEl, error.message, "error");
  }
}

async function cancelOrder(orderId) {
  try {
    await apiFetch(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    showStatus(statusEl, `Order ${orderId} cancelled successfully.`, "success");
    await loadOrders();
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

async function toggleOrderDetails(orderId, buttonEl) {
  const detailsEl = document.getElementById(`order-details-${orderId}`);
  if (!detailsEl) return;

  if (detailsEl.style.display === "block") {
    detailsEl.style.display = "none";
    buttonEl.textContent = "View Details";
    return;
  }

  buttonEl.disabled = true;
  try {
    const data = await apiFetch(`/orders/${orderId}`);
    detailsEl.innerHTML = itemRows(data.order?.items || []);
    detailsEl.style.display = "block";
    buttonEl.textContent = "Hide Details";
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  } finally {
    buttonEl.disabled = false;
  }
}

await loadOrders();
