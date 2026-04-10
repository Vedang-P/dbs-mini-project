import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("orders");

const statusEl = document.getElementById("status");
const ordersListEl = document.getElementById("ordersList");

function itemRows(items = []) {
  if (!items.length) return "<p class='muted'>No items found for this order.</p>";
  return items
    .map(
      (item) => `
        <div class="order-item">
          ${item.product_name} | Qty: ${item.quantity} | Unit: ₹${Number(item.unit_price).toFixed(2)} | Line: ₹${Number(item.line_total).toFixed(2)}
        </div>
      `,
    )
    .join("");
}

async function loadOrders() {
  if (!user) return;
  try {
    const data = await apiFetch(`/orders?user_id=${user.user_id}`);
    const orders = data.orders || [];

    ordersListEl.innerHTML = orders
      .map(
        (order) => `
          <article class="card" style="margin-bottom: 12px">
            <h3>Order #${order.order_id}</h3>
            <p><strong>Status:</strong> <span class="pill">${order.order_status}</span></p>
            <p><strong>Placed At:</strong> ${new Date(order.placed_at).toLocaleString()}</p>
            <p><strong>Total:</strong> ₹${Number(order.total_amount).toFixed(2)}</p>
            ${itemRows(order.items)}
            ${
              order.order_status === "PLACED"
                ? `<button class="danger inline cancel-order-btn" data-order-id="${order.order_id}">Cancel Order</button>`
                : ""
            }
          </article>
        `,
      )
      .join("");

    if (!orders.length) {
      ordersListEl.innerHTML = "<p class='muted'>No orders found yet.</p>";
    }

    ordersListEl.querySelectorAll(".cancel-order-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await cancelOrder(Number(btn.dataset.orderId));
      });
    });
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

async function cancelOrder(orderId) {
  try {
    await apiFetch(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ user_id: user.user_id }),
    });
    showStatus(statusEl, `Order ${orderId} cancelled successfully.`, "success");
    await loadOrders();
  } catch (error) {
    showStatus(statusEl, error.message, "error");
  }
}

loadOrders();
