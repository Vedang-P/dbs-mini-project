import { apiFetch, requireActiveUser } from "./api.js";
import { initRevealAnimations, renderFooter, renderNavbar, showStatus } from "./ui.js";

const user = requireActiveUser();
renderNavbar("admin");
renderFooter();
initRevealAnimations();

const adminStatusEl = document.getElementById("adminStatus");
const adminLoadingEl = document.getElementById("adminLoading");
const summaryCardsEl = document.getElementById("summaryCards");
const lowStockListEl = document.getElementById("lowStockList");
const topProductsListEl = document.getElementById("topProductsList");
const inventoryAuditListEl = document.getElementById("inventoryAuditList");
const orderAuditListEl = document.getElementById("orderAuditList");
const addProductFormEl = document.getElementById("addProductForm");
const addProductSubmitEl = document.getElementById("addProductSubmit");
const addProductStatusEl = document.getElementById("adminProductStatus");
const categorySelectEl = document.getElementById("newProductCategory");

function renderCategoryOptions(categories = []) {
  if (!categorySelectEl) return;
  if (!categories.length) {
    categorySelectEl.innerHTML = `<option value="">No categories available</option>`;
    categorySelectEl.disabled = true;
    return;
  }

  categorySelectEl.disabled = false;
  categorySelectEl.innerHTML = categories
    .map((category) => `<option value="${category.category_id}">${category.category_name}</option>`)
    .join("");
}

function bindAddProductForm() {
  if (!addProductFormEl || addProductFormEl.dataset.bound === "true") return;

  addProductFormEl.dataset.bound = "true";
  addProductFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!categorySelectEl?.value) {
      showStatus(addProductStatusEl, "Please choose a category.", "error");
      return;
    }

    addProductSubmitEl.disabled = true;
    addProductSubmitEl.textContent = "Adding...";

    const payload = {
      category_id: Number(categorySelectEl.value),
      sku: document.getElementById("newProductSku").value.trim(),
      product_name: document.getElementById("newProductName").value.trim(),
      description: document.getElementById("newProductDescription").value.trim() || null,
      price: Number(document.getElementById("newProductPrice").value),
      stock_qty: Number(document.getElementById("newProductStock").value),
      reorder_level: Number(document.getElementById("newProductReorder").value),
      is_active: document.getElementById("newProductActive").checked,
    };

    try {
      const result = await apiFetch("/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showStatus(
        addProductStatusEl,
        `Product created: ${result.product?.product_name || payload.product_name} (${result.product?.sku || payload.sku}).`,
        "success",
      );
      addProductFormEl.reset();
      document.getElementById("newProductStock").value = "0";
      document.getElementById("newProductReorder").value = "5";
      document.getElementById("newProductActive").checked = true;
      await loadAdmin();
    } catch (error) {
      showStatus(addProductStatusEl, error.message, "error");
    } finally {
      addProductSubmitEl.disabled = false;
      addProductSubmitEl.textContent = "Add Product";
    }
  });
}

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
    targetEl.innerHTML = "<div class='empty-state'>No records found.</div>";
    return;
  }

  targetEl.innerHTML = `
    <table class="insight-table">
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
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
  adminLoadingEl.style.display = "grid";

  try {
    const me = await apiFetch("/auth/me");
    if (!me?.user?.is_admin) {
      showStatus(adminStatusEl, "Admin access required.", "error");
      adminLoadingEl.style.display = "none";
      return;
    }

    const [summaryData, lowStockData, topData, auditData, categoriesData] = await Promise.all([
      apiFetch("/admin/summary"),
      apiFetch("/admin/low-stock"),
      apiFetch("/admin/top-products"),
      apiFetch("/admin/audit"),
      apiFetch("/categories"),
    ]);

    renderSummaryCards(summaryData.summary);
    renderCategoryOptions(categoriesData.categories || []);
    bindAddProductForm();
    renderTable(
      lowStockListEl,
      ["Product", "SKU", "Category", "Stock", "Reorder"],
      (lowStockData.products || []).map((p) => [p.product_name, p.sku, p.category_name, p.stock_qty, p.reorder_level]),
    );
    renderTable(
      topProductsListEl,
      ["Product", "Units Sold", "Revenue"],
      (topData.products || []).map((p) => [p.product_name, p.units_sold, `₹${Number(p.revenue || 0).toFixed(2)}`]),
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
    initRevealAnimations();
  } catch (error) {
    adminLoadingEl.style.display = "none";
    showStatus(adminStatusEl, error.message, "error");
  }
}

await loadAdmin();
