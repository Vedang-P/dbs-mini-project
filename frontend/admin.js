import { apiFetch, requireActiveUser } from "./api.js";
import { renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("admin");

const adminStatusEl = document.getElementById("adminStatus");
const adminLoadingEl = document.getElementById("adminLoading");
const summaryCardsEl = document.getElementById("summaryCards");
const lowStockListEl = document.getElementById("lowStockList");
const topProductsListEl = document.getElementById("topProductsList");
const inventoryAuditListEl = document.getElementById("inventoryAuditList");
const orderAuditListEl = document.getElementById("orderAuditList");

function renderSummaryCards(summary) {
  const cards = [
    ["Total Users", summary.total_users],
    ["Total Orders", summary.total_orders],
    ["Placed Orders", summary.placed_orders],
    ["Completed Orders", summary.completed_orders],
    ["Cancelled Orders", summary.cancelled_orders],
    ["Low Stock", summary.low_stock_products],
    ["Gross Revenue", `₹${Number(summary.gross_revenue || 0).toFixed(2)}`],
  ];

  summaryCardsEl.innerHTML = cards
    .map(
      ([label, value]) => `
      <article class="card metric-card">
        <p class="muted">${label}</p>
        <h3>${value}</h3>
      </article>
    `,
    )
    .join("");
}

function renderTable(targetEl, headers, rows) {
  if (!rows.length) {
    targetEl.innerHTML = "<p class='muted'>No records found.</p>";
    return;
  }

  targetEl.innerHTML = `
    <table class="insight-table">
      <thead>
        <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>${row.map((value) => `<td>${value ?? "-"}</td>`).join("")}</tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function loadAdmin() {
  if (!user) return;
  adminLoadingEl.style.display = "block";

  try {
    const me = await apiFetch("/auth/me");
    if (!me?.user?.is_admin) {
      showStatus(adminStatusEl, "Admin access required.", "error");
      adminLoadingEl.style.display = "none";
      return;
    }

    const [summaryData, lowStockData, topData, auditData] = await Promise.all([
      apiFetch("/admin/summary"),
      apiFetch("/admin/low-stock"),
      apiFetch("/admin/top-products"),
      apiFetch("/admin/audit"),
    ]);

    renderSummaryCards(summaryData.summary);
    renderTable(
      lowStockListEl,
      ["Product", "SKU", "Category", "Stock", "Reorder"],
      (lowStockData.products || []).map((p) => [
        p.product_name,
        p.sku,
        p.category_name,
        p.stock_qty,
        p.reorder_level,
      ]),
    );
    renderTable(
      topProductsListEl,
      ["Product", "Units Sold", "Revenue"],
      (topData.products || []).map((p) => [
        p.product_name,
        p.units_sold,
        `₹${Number(p.revenue || 0).toFixed(2)}`,
      ]),
    );
    renderTable(
      inventoryAuditListEl,
      ["Time", "Product", "Old", "New", "Change", "Reason"],
      (auditData.inventory_audit || []).map((a) => [
        new Date(a.changed_at).toLocaleString(),
        a.product_name,
        a.old_stock,
        a.new_stock,
        a.change_qty,
        a.reason,
      ]),
    );
    renderTable(
      orderAuditListEl,
      ["Time", "Order", "Old", "New", "Note"],
      (auditData.order_audit || []).map((a) => [
        new Date(a.changed_at).toLocaleString(),
        a.order_id,
        a.old_status,
        a.new_status,
        a.note,
      ]),
    );
    adminLoadingEl.style.display = "none";
  } catch (error) {
    adminLoadingEl.style.display = "none";
    showStatus(adminStatusEl, error.message, "error");
  }
}

await loadAdmin();
