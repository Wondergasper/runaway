/* ══════════════════════════════════════════════
   RUNAWAY — Owner Dashboard Engine
   ══════════════════════════════════════════════ */
"use strict";

// 1. Auth Guard: immediately enforce session protection
if (sessionStorage.getItem("runaway_owner_session") !== "active") {
  window.location.replace("login.html");
}

// 2. Helpers
const $ = (id) => document.getElementById(id);

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) && amount > 0 ? amount : 0);

const formatDate = (isoStr) => {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return isoStr;
  }
};

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

// 3. State Management
let currentFilter = "all";
let searchQuery = "";
let orders = [];
let customProducts = [];
let deletedSlugs = [];
let currentUploadImage = "../public/images/tee-front.jpg";

// ── CUSTOM PRODUCTS PERSISTENCE ──
function loadCustomProducts() {
  try {
    const raw = localStorage.getItem("runaway_custom_products");
    customProducts = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse custom products:", e);
    customProducts = [];
  }
}

function saveCustomProducts() {
  try {
    localStorage.setItem("runaway_custom_products", JSON.stringify(customProducts));
  } catch (e) {
    console.error("Failed to save custom products:", e);
  }
}

// ── DELETED SLUGS PERSISTENCE ──
function loadDeletedSlugs() {
  try {
    const raw = localStorage.getItem("runaway_deleted_slugs");
    deletedSlugs = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse deleted slugs:", e);
    deletedSlugs = [];
  }
}

function saveDeletedSlugs() {
  try {
    localStorage.setItem("runaway_deleted_slugs", JSON.stringify(deletedSlugs));
  } catch (e) {
    console.error("Failed to save deleted slugs:", e);
  }
}

function getCombinedProducts() {
  const base = typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : [];
  const deletedSet = new Set(deletedSlugs);
  const customMap = new Map(customProducts.map((p) => [p.slug, p]));
  const combined = [];

  for (const p of base) {
    if (deletedSet.has(p.slug)) continue;
    if (customMap.has(p.slug)) {
      combined.push(customMap.get(p.slug));
      customMap.delete(p.slug);
    } else {
      combined.push(p);
    }
  }

  for (const p of customMap.values()) {
    if (!deletedSet.has(p.slug)) {
      combined.push(p);
    }
  }

  return combined;
}

// ── ORDERS PERSISTENCE ──
function loadOrders() {
  try {
    const raw = JSON.parse(localStorage.getItem("runaway_orders") || "[]");
    orders = Array.isArray(raw) ? raw.map((o) => {
      // Auto-migrate legacy test orders from earlier dollar values
      if (o && typeof o.total === "number" && o.total < 100000) {
        o.total = o.total * 10;
        if (Array.isArray(o.items)) {
          o.items.forEach((it) => {
            if (it && typeof it.price === "number" && it.price < 100000) {
              it.price = it.price * 10;
            }
          });
        }
      }
      return o;
    }) : [];
  } catch (e) {
    console.error("Failed to parse orders:", e);
    orders = [];
  }
}

function saveOrders() {
  try {
    localStorage.setItem("runaway_orders", JSON.stringify(orders));
  } catch (e) {
    console.error("Failed to save orders:", e);
  }
}

// 4. Render Metrics
function renderMetrics() {
  const totalRevenueEl = $("statRevenue");
  const totalOrdersEl = $("statOrders");
  const aovEl = $("statAOV");
  const pendingOrdersEl = $("statPending");

  const validOrders = orders.filter((o) => o.status !== "Cancelled");
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCount = orders.length;
  const aov = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;
  const pendingCount = orders.filter((o) => o.status === "Pending").length;

  if (totalRevenueEl) totalRevenueEl.textContent = formatMoney(totalRevenue);
  if (totalOrdersEl) totalOrdersEl.textContent = totalCount;
  if (aovEl) aovEl.textContent = formatMoney(aov);
  if (pendingOrdersEl) pendingOrdersEl.textContent = pendingCount;
}

// 5. Render Orders Table (with live search & status tabs)
function renderOrders() {
  const tbody = $("ordersTableBody");
  if (!tbody) return;

  const query = searchQuery.trim().toLowerCase();

  const filtered = orders.filter((o) => {
    // 1. Status Filter
    if (currentFilter !== "all" && (o.status || "").toLowerCase() !== currentFilter.toLowerCase()) {
      return false;
    }
    // 2. Search Query Filter
    if (query) {
      const matchId = (o.id || "").toLowerCase().includes(query);
      const matchName = (o.customer?.name || "").toLowerCase().includes(query);
      const matchEmail = (o.customer?.email || "").toLowerCase().includes(query);
      const matchItems = (o.items || []).some((it) => (it.name || "").toLowerCase().includes(query));
      if (!matchId && !matchName && !matchEmail && !matchItems) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="table-empty">
            <p class="muted">No orders found matching criteria${query ? ` for "${query}"` : ""}.</p>
            ${orders.length === 0 ? '<button class="btn btn-ghost btn-sm" id="emptySeedBtn"><span>Seed Sample Orders</span></button>' : ''}
          </div>
        </td>
      </tr>`;
    $("emptySeedBtn")?.addEventListener("click", seedDemoOrders);
    return;
  }

  tbody.innerHTML = filtered.map((o) => {
    const statusClass = (o.status || "Pending").toLowerCase();
    const itemsSummary = (o.items || [])
      .map((it) => `${it.qty}x ${it.name} (${it.size || "M"}${it.colorName ? " · " + it.colorName : ""})`)
      .join("<br />");

    const toggleActionText = o.status === "Fulfilled" ? "Mark Pending" : "Mark Fulfilled";
    const toggleTargetStatus = o.status === "Fulfilled" ? "Pending" : "Fulfilled";

    return `
      <tr>
        <td>
          <button class="order-link" data-action="view-slip" data-id="${o.id}" title="View order packing slip">
            ${o.id}
          </button>
        </td>
        <td>
          <div style="font-weight: 500;">${o.customer?.name || "Anonymous Runner"}</div>
          <div class="subtle" style="font-size: .75rem;">${o.customer?.email || "—"}</div>
        </td>
        <td style="font-size: .8rem; line-height: 1.4;">${itemsSummary || "—"}</td>
        <td class="tabular"><strong class="gold">${formatMoney(o.total)}</strong></td>
        <td class="subtle tabular" style="font-size: .78rem;">${formatDate(o.date)}</td>
        <td>
          <span class="badge badge-${statusClass}">${o.status || "Pending"}</span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-ghost btn-sm" data-action="view-slip" data-id="${o.id}" title="View Slip">
              <span>Slip 📄</span>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="toggle" data-id="${o.id}" data-target="${toggleTargetStatus}">
              <span>${toggleActionText}</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${o.id}" title="Delete order">
              <span>✕</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function getAdminStorefrontUrl(p) {
  if (p.file) {
    // Normalize relative prefix so it always points exactly 1 level up from admin/
    const clean = p.file.replace(/^(\.\.\/|\.\/)/, "");
    return `../${clean}`;
  }
  return `../products/product.html?slug=${encodeURIComponent(p.slug)}`;
}

// 6. Render Inventory Overview (Core + Custom Uploaded Pieces)
function renderInventory() {
  const container = $("inventoryGrid");
  if (!container) return;

  const allPieces = getCombinedProducts();

  if (allPieces.length === 0) {
    container.innerHTML = `<p class="muted" style="padding: 1.5rem;">No catalogue pieces found.</p>`;
    return;
  }

  container.innerHTML = allPieces.map((p) => {
    let mainImg = p.image || (p.images && p.images[0]) || "../public/images/logo-runners.png";
    if (typeof mainImg === "string" && !mainImg.startsWith("data:") && !mainImg.startsWith("http") && !mainImg.startsWith("..") && !mainImg.startsWith("/")) {
      mainImg = `../public/images/${mainImg}`;
    }

    const colorsList = (p.colors || []).map((c) => c.name).join(", ") || "Single colorway";
    const sizesList = (p.sizes || []).join(" · ") || "All sizes";
    const isCustom = Boolean(p.isCustom);
    const storefrontUrl = getAdminStorefrontUrl(p);

    return `
      <div class="inv-card">
        <img class="inv-img" src="${mainImg}" alt="${p.name}" />
        <div class="inv-info">
          ${isCustom ? '<span class="inv-badge-custom">Custom Piece</span>' : '<span class="inv-badge-core">Core Piece</span>'}
          <span class="inv-cat">${p.category}</span>
          <h4 class="inv-name">${p.name}</h4>
          <span class="inv-price tabular">${formatMoney(p.price)}</span>
          <p class="subtle" style="font-size: .72rem; margin-top: .3rem;">${sizesList}</p>
          <p class="subtle" style="font-size: .72rem;">Colors: ${colorsList}</p>
          <div class="inv-actions">
            <button class="btn btn-ghost btn-sm" data-action="preview-piece" data-slug="${p.slug}" title="Inspect piece specifications">
              <span>Preview 👁️</span>
            </button>
            <button class="btn btn-ghost btn-sm btn-edit" data-action="edit-piece" data-slug="${p.slug}" title="Edit piece specifications & price">
              <span>Edit ✏️</span>
            </button>
            <a href="${storefrontUrl}" target="_blank" class="btn btn-ghost btn-sm" title="Open customer page">
              <span>Storefront ↗</span>
            </a>
            <button class="btn btn-danger btn-sm" data-action="delete-piece" data-slug="${p.slug}" title="Remove piece from catalogue">
              <span>Delete ✕</span>
            </button>
          </div>
        </div>
      </div>`;
  }).join("");
}

// 7. Render Top Selling Pieces (Analytics)
function renderTopSellers() {
  const container = $("topSellersGrid");
  if (!container) return;

  const validOrders = orders.filter((o) => o.status !== "Cancelled");
  const salesMap = {};

  validOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const name = it.name || "Unknown Item";
      if (!salesMap[name]) {
        salesMap[name] = { name, units: 0, revenue: 0, sampleImg: null };
      }
      salesMap[name].units += (it.qty || 1);
      salesMap[name].revenue += ((it.price || 0) * (it.qty || 1));
    });
  });

  const ranked = Object.values(salesMap).sort((a, b) => b.units - a.units || b.revenue - a.revenue);

  if (ranked.length === 0) {
    // Fallback: preview default top catalog pieces
    const catalogue = getCombinedProducts().slice(0, 3);
    container.innerHTML = catalogue.map((p, idx) => {
      let mainImg = p.image || (p.images && p.images[0]) || "../public/images/logo-runners.png";
      if (typeof mainImg === "string" && !mainImg.startsWith("data:") && !mainImg.startsWith("http") && !mainImg.startsWith("..") && !mainImg.startsWith("/")) {
        mainImg = `../public/images/${mainImg}`;
      }
      return `
        <div class="seller-card">
          <span class="seller-rank">#${idx + 1}</span>
          <img class="seller-img" src="${mainImg}" alt="${p.name}" />
          <div class="seller-info">
            <h4 class="seller-name">${p.name}</h4>
            <span class="seller-stat subtle">Storefront Featured</span>
            <span class="seller-rev tabular">${formatMoney(p.price)}</span>
          </div>
        </div>`;
    }).join("");
    return;
  }

  // Find image for ranked pieces from catalogue
  const allPieces = getCombinedProducts();
  container.innerHTML = ranked.slice(0, 4).map((item, idx) => {
    const matched = allPieces.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
    let mainImg = matched ? (matched.image || (matched.images && matched.images[0])) : "../public/images/logo-runners.png";
    if (typeof mainImg === "string" && !mainImg.startsWith("data:") && !mainImg.startsWith("http") && !mainImg.startsWith("..") && !mainImg.startsWith("/")) {
      mainImg = `../public/images/${mainImg}`;
    }

    return `
      <div class="seller-card">
        <span class="seller-rank">#${idx + 1}</span>
        <img class="seller-img" src="${mainImg}" alt="${item.name}" />
        <div class="seller-info">
          <h4 class="seller-name">${item.name}</h4>
          <span class="seller-stat">${item.units} units fulfilled</span>
          <span class="seller-rev tabular">${formatMoney(item.revenue)}</span>
        </div>
      </div>`;
  }).join("");
}

// 8. Order Packing Slip Modal
function openOrderDetail(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const modal = $("orderDetailModal");
  const slipId = $("slipOrderId");
  const slipDate = $("slipDate");
  const slipBody = $("slipBody");

  if (!modal || !slipBody) return;

  slipId.textContent = `Packing Slip — ${order.id}`;
  slipDate.textContent = `Placed on ${formatDate(order.date)}`;

  const itemsRows = (order.items || []).map((it) => {
    const lineTotal = (it.price || 0) * (it.qty || 1);
    return `
      <tr>
        <td>
          <strong>${it.name}</strong>
          <div class="subtle" style="font-size: .72rem;">${it.colorName ? it.colorName + " · " : ""}Size: ${it.size || "M"}</div>
        </td>
        <td style="text-align: center;">${it.qty || 1}</td>
        <td class="tabular" style="text-align: right;">${formatMoney(it.price)}</td>
        <td class="tabular gold" style="text-align: right;">${formatMoney(lineTotal)}</td>
      </tr>`;
  }).join("");

  slipBody.innerHTML = `
    <div class="slip-meta-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      <div>
        <span class="slip-field-label">Customer Details</span>
        <div class="slip-field-val">${order.customer?.name || "Anonymous Runner"}</div>
        <div class="subtle" style="font-size: .75rem;">${order.customer?.email || "—"}</div>
        <div class="subtle" style="font-size: .75rem; margin-top: .2rem;">📞 ${order.customer?.phone || "No phone provided"}</div>
      </div>
      <div>
        <span class="slip-field-label">Delivery Coordinates</span>
        <div class="slip-field-val" style="font-size:.85rem;line-height:1.35;">${order.customer?.address || "Address on file"}</div>
        <div class="subtle" style="font-size: .75rem; margin-top: .2rem;">${order.customer?.city ? order.customer.city + ", " : ""}${order.customer?.state || "Lagos, Nigeria"}</div>
      </div>
      <div>
        <span class="slip-field-label">Dispatch Status</span>
        <div class="slip-field-val">
          <span class="badge badge-${(order.status || "Pending").toLowerCase()}">${order.status || "Pending"}</span>
        </div>
        <div class="subtle" style="font-size: .75rem; margin-top: .3rem;">Carrier: RUNAWAY Express Courier</div>
      </div>
    </div>

    <div>
      <h4 style="font-size: .85rem; letter-spacing: .12em; text-transform: uppercase; margin-bottom: .6rem; color: var(--gold);">
        Dispatched Pieces
      </h4>
      <table class="slip-items-table">
        <thead>
          <tr>
            <th>Piece Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div class="slip-total-box">
      <span class="slip-sub">Nationwide Courier Delivery: <strong class="gold">FREE (₦0)</strong></span>
      <span class="slip-sub">Total Dispatched Value</span>
      <span class="slip-grand tabular">${formatMoney(order.total)}</span>
    </div>
  `;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeOrderDetail() {
  const modal = $("orderDetailModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

// 8b. Piece Preview Modal (In-Dashboard Inspection)
function openPiecePreview(slug) {
  const p = getCombinedProducts().find((item) => item.slug === slug);
  if (!p) return;

  const modal = $("viewPieceModal");
  const vpName = $("vpName");
  const vpCategory = $("vpCategory");
  const vpLink = $("vpStorefrontLink");
  const vpBody = $("vpBody");

  if (!modal || !vpBody) return;

  const storefrontUrl = getAdminStorefrontUrl(p);

  if (vpName) vpName.textContent = p.name;
  if (vpCategory) vpCategory.textContent = `${p.category} · ${p.isCustom ? "Custom Activewear Piece" : "Core Collection"}`;
  if (vpLink) vpLink.href = storefrontUrl;

  const images = Array.isArray(p.images) && p.images.length ? p.images : [p.image || "logo-runners.png"];

  const resolvePieceImg = (src) => {
    if (!src) return "../public/images/logo-runners.png";
    if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("..")) return src;
    return `../public/images/${src}`;
  };

  const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [{ name: "Core", hex: "#0c0c0c" }];
  const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ["S", "M", "L"];

  const thumbButtons = images.length > 1 ? `
    <div class="piece-thumb-strip" id="vpThumbs">
      ${images.map((img, i) => `
        <button type="button" class="piece-thumb-btn ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <img src="${resolvePieceImg(img)}" alt="" />
        </button>
      `).join("")}
    </div>` : '';

  vpBody.innerHTML = `
    <div class="piece-preview-grid">
      <div class="piece-preview-media">
        <img id="vpMainImg" src="${resolvePieceImg(images[0])}" alt="${p.name}" />
        ${thumbButtons}
      </div>

      <div class="piece-preview-info">
        <div>
          <span class="subtle" style="font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;">${p.tagline || ""}</span>
          <div style="margin-top:.4rem;display:flex;align-items:baseline;justify-content:space-between;">
            <span class="gold tabular" style="font-size:1.6rem;font-family:var(--display);">${formatMoney(p.price)}</span>
            ${p.isCustom ? '<span class="inv-badge-custom">Custom Piece</span>' : '<span class="subtle" style="font-size:.72rem;">Core Piece</span>'}
          </div>
        </div>

        <p class="muted" style="font-size:.84rem;line-height:1.5;">${p.description || p.story || "Engineered for high-heat, high-speed endurance."}</p>

        <div>
          <span class="form-label">Available Colorways</span>
          <div class="piece-colors-row">
            ${colors.map((c) => `
              <span class="piece-color-chip">
                <span class="piece-color-dot" style="background:${c.hex || c.swatch || '#0c0c0c'};"></span>
                ${c.name}
              </span>
            `).join("")}
          </div>
        </div>

        <div>
          <span class="form-label">Sizing</span>
          <div class="piece-sizes-row">
            ${sizes.map((s) => `<span class="piece-size-pill">${s}</span>`).join("")}
          </div>
        </div>

        <div class="piece-preview-specs">
          <div class="spec-item">
            <dt>Fabric Blend</dt>
            <dd>${p.fabric || p.specs?.fabric || "4-way technical stretch woven"}</dd>
          </div>
          <div class="spec-item">
            <dt>Tailored Fit</dt>
            <dd>${p.fit || p.specs?.fit || "Athletic compression"}</dd>
          </div>
          <div class="spec-item">
            <dt>Origin</dt>
            <dd>${p.specs?.origin || "Crafted in Nigeria"}</dd>
          </div>
          <div class="spec-item">
            <dt>Care</dt>
            <dd>${p.specs?.care || "Cold wash, hang dry"}</dd>
          </div>
        </div>

        <div class="piece-modal-actions">
          <button class="btn btn-gold btn-sm" data-action="edit-piece" data-slug="${p.slug}" title="Edit this piece">
            <span>Edit Piece ✏️</span>
          </button>
          <a href="${storefrontUrl}" target="_blank" class="btn btn-ghost btn-sm" title="View customer product page">
            <span>View Full PDP ↗</span>
          </a>
          <button class="btn btn-danger btn-sm" data-action="delete-piece" data-slug="${p.slug}" title="Remove piece from catalogue">
            <span>Delete Piece ✕</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Wire thumbnail switching
  vpBody.querySelectorAll(".piece-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      vpBody.querySelectorAll(".piece-thumb-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const idx = +btn.dataset.idx;
      const mainEl = $("vpMainImg");
      if (mainEl && images[idx]) {
        mainEl.src = resolvePieceImg(images[idx]);
      }
    });
  });

  // Wire edit action inside preview modal
  const editBtn = vpBody.querySelector('[data-action="edit-piece"]');
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      openEditProduct(p.slug);
    });
  }

  // Wire delete action inside preview modal
  const delBtn = vpBody.querySelector('[data-action="delete-piece"]');
  if (delBtn) {
    delBtn.addEventListener("click", () => {
      deleteProduct(p.slug);
    });
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closePiecePreview() {
  const modal = $("viewPieceModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

// 9. CSV Export Feature
function exportOrdersToCSV() {
  if (orders.length === 0) {
    alert("No orders available to export.");
    return;
  }

  const headers = ["Order ID", "Date", "Customer Name", "Customer Email", "Customer Phone", "Street Address", "City", "State", "Status", "Total NGN", "Items Count", "Items Detail"];
  const rows = orders.map((o) => {
    const itemsDetail = (o.items || [])
      .map((it) => `${it.qty}x ${it.name} (${it.size || "M"}${it.colorName ? " " + it.colorName : ""})`)
      .join("; ");

    return [
      `"${o.id || ""}"`,
      `"${o.date || ""}"`,
      `"${(o.customer?.name || "").replace(/"/g, '""')}"`,
      `"${(o.customer?.email || "").replace(/"/g, '""')}"`,
      `"${(o.customer?.phone || "").replace(/"/g, '""')}"`,
      `"${(o.customer?.address || "").replace(/"/g, '""')}"`,
      `"${(o.customer?.city || "").replace(/"/g, '""')}"`,
      `"${(o.customer?.state || "").replace(/"/g, '""')}"`,
      `"${o.status || "Pending"}"`,
      `"${o.total || 0}"`,
      `"${(o.items || []).length}"`,
      `"${itemsDetail.replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `runaway_orders_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 10. Product CRUD Operations (Upload, Edit, Delete)
function deleteProduct(slug) {
  const all = getCombinedProducts();
  const p = all.find((item) => item.slug === slug) || 
    (typeof PRODUCTS !== "undefined" ? PRODUCTS.find((item) => item.slug === slug) : null) ||
    customProducts.find((item) => item.slug === slug);
  const name = p ? p.name : slug;

  if (!confirm(`Are you sure you want to remove "${name}" from your catalogue?`)) {
    return;
  }

  const isCustom = customProducts.some((item) => item.slug === slug);
  if (isCustom) {
    customProducts = customProducts.filter((item) => item.slug !== slug);
    saveCustomProducts();
  }

  // Record in deletedSlugs so both core products and any remnants are permanently filtered out
  if (!deletedSlugs.includes(slug)) {
    deletedSlugs.push(slug);
    saveDeletedSlugs();
  }

  closePiecePreview();
  renderInventory();
  renderTopSellers();
}

function restoreCoreCatalogue() {
  if (deletedSlugs.length === 0) {
    alert("Core catalogue is already intact. No hidden pieces to restore.");
    return;
  }
  if (!confirm(`Restore ${deletedSlugs.length} hidden catalogue piece(s) back to your storefront inventory?`)) {
    return;
  }
  deletedSlugs = [];
  saveDeletedSlugs();
  renderInventory();
  renderTopSellers();
  alert("Core catalogue restored! All standard collection pieces are now visible.");
}

function openEditProduct(slug) {
  const p = getCombinedProducts().find((item) => item.slug === slug);
  if (!p) return;

  closePiecePreview();

  const modal = $("productModal");
  const modalTitle = $("productModalTitle");
  const modalSub = $("productModalSub");
  const saveBtn = $("saveProductBtn");
  const pEditingSlug = $("pEditingSlug");
  const imgPreview = $("imgPreview");
  const previewLabel = $("previewLabel");

  if (modalTitle) modalTitle.textContent = "Edit Collection Piece";
  if (modalSub) modalSub.textContent = `Modify specifications, pricing, and imagery for "${p.name}".`;
  if (saveBtn) {
    const span = saveBtn.querySelector("span");
    if (span) span.textContent = "Save Changes ✓";
  }
  if (pEditingSlug) pEditingSlug.value = p.slug;

  if ($("pName")) $("pName").value = p.name || "";
  if ($("pCategory")) $("pCategory").value = p.category || "Tops";
  if ($("pPrice")) $("pPrice").value = p.price || "";
  if ($("pTagline")) $("pTagline").value = p.tagline || "";
  if ($("pDesc")) $("pDesc").value = p.description || p.story || "";

  // Colorway
  const firstColor = (p.colors && p.colors[0]) || { name: "Eclipse", hex: "#0c0c0c", swatch: "#0c0c0c" };
  const colorName = firstColor.name || "Eclipse";
  const colorHex = firstColor.hex || firstColor.swatch || "#0c0c0c";
  if ($("pColorName")) $("pColorName").value = colorName;
  if ($("pColorHex")) $("pColorHex").value = colorHex;
  if ($("pColorHexText")) $("pColorHexText").value = colorHex;

  // Sizes
  const sizesSet = new Set(p.sizes || []);
  document.querySelectorAll('input[name="sizes"]').forEach((cb) => {
    cb.checked = sizesSet.has(cb.value);
  });

  // Specs
  if ($("pFabric")) $("pFabric").value = p.fabric || p.specs?.fabric || "";
  if ($("pFit")) $("pFit").value = p.fit || p.specs?.fit || "";

  // Media
  const currentImg = p.image || (p.images && p.images[0]) || "../public/images/tee-front.jpg";
  currentUploadImage = currentImg;
  const resolvePieceImg = (src) => {
    if (!src) return "../public/images/logo-runners.png";
    if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("..")) return src;
    return `../public/images/${src}`;
  };
  if (imgPreview) imgPreview.src = resolvePieceImg(currentImg);
  if (previewLabel) previewLabel.textContent = "Current Image";
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));

  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
}

function resetProductFormForCreate() {
  const form = $("productForm");
  const modalTitle = $("productModalTitle");
  const modalSub = $("productModalSub");
  const saveBtn = $("saveProductBtn");
  const pEditingSlug = $("pEditingSlug");
  const imgPreview = $("imgPreview");
  const previewLabel = $("previewLabel");

  if (form) form.reset();
  if (pEditingSlug) pEditingSlug.value = "";
  if (modalTitle) modalTitle.textContent = "Upload Collection Piece";
  if (modalSub) modalSub.textContent = "Publish a new performance piece to the storefront catalogue.";
  if (saveBtn) {
    const span = saveBtn.querySelector("span");
    if (span) span.textContent = "Publish Piece ↗";
  }

  currentUploadImage = "../public/images/tee-front.jpg";
  if (imgPreview) imgPreview.src = currentUploadImage;
  if (previewLabel) previewLabel.textContent = "Default Preview";
  document.querySelectorAll(".preset-btn").forEach((b, i) => b.classList.toggle("active", i === 0));

  // Reset checkboxes to default S, M, L
  document.querySelectorAll('input[name="sizes"]').forEach((cb) => {
    cb.checked = ["S", "M", "L"].includes(cb.value);
  });
}

function openProductModal() {
  resetProductFormForCreate();
  const modal = $("productModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeProductModal() {
  const modal = $("productModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function setupProductUpload() {
  const dropZone = $("dropZone");
  const fileInput = $("pieceImgFile");
  const imgPreview = $("imgPreview");
  const previewLabel = $("previewLabel");
  const productForm = $("productForm");
  const colorHex = $("pColorHex");
  const colorHexText = $("pColorHexText");

  // Sync color pickers
  if (colorHex && colorHexText) {
    colorHex.addEventListener("input", (e) => {
      colorHexText.value = e.target.value;
    });
    colorHexText.addEventListener("input", (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        colorHex.value = e.target.value;
      }
    });
  }

  // Presets click
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const presetFile = btn.dataset.preset;
      currentUploadImage = `../public/images/${presetFile}`;
      if (imgPreview) imgPreview.src = currentUploadImage;
      if (previewLabel) previewLabel.textContent = `Preset: ${btn.textContent}`;
    });
  });

  // Dropzone file handling
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("is-dragover");
    });

    ["dragleave", "dragend"].forEach((evt) => {
      dropZone.addEventListener(evt, () => dropZone.classList.remove("is-dragover"));
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("is-dragover");
      if (e.dataTransfer?.files?.[0]) {
        processUploadedImage(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target?.files?.[0]) {
        processUploadedImage(e.target.files[0]);
      }
    });
  }

  function processUploadedImage(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      currentUploadImage = evt.target.result;
      if (imgPreview) imgPreview.src = currentUploadImage;
      if (previewLabel) previewLabel.textContent = file.name;
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
    };
    reader.readAsDataURL(file);
  }

  // Form submit (Handles both Create and Edit)
  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const editingSlug = $("pEditingSlug")?.value?.trim();
      const name = $("pName")?.value?.trim();
      const category = $("pCategory")?.value;
      const price = Number($("pPrice")?.value);
      const tagline = $("pTagline")?.value?.trim();
      const desc = $("pDesc")?.value?.trim();
      const colorName = $("pColorName")?.value?.trim() || "Eclipse";
      const colorHexVal = $("pColorHex")?.value || "#0c0c0c";
      const fabric = $("pFabric")?.value?.trim();
      const fit = $("pFit")?.value?.trim();

      // Gather sizes
      const checkedSizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked'))
        .map((el) => el.value);

      if (!name || !price) {
        alert("Please provide piece name and price.");
        return;
      }

      if (editingSlug) {
        // ── EDIT MODE ──
        let target = customProducts.find((p) => p.slug === editingSlug);
        if (!target) {
          // Editing a core product: instantiate an override custom piece with same slug
          const baseCore = typeof PRODUCTS !== "undefined" ? PRODUCTS.find((p) => p.slug === editingSlug) : null;
          target = {
            id: `override-${Date.now()}`,
            slug: editingSlug,
            file: baseCore?.file,
            createdAt: new Date().toISOString()
          };
          customProducts.unshift(target);
        }

        target.name = name;
        target.category = category || "Tops";
        target.price = price;
        target.tagline = tagline || target.tagline || "Engineered Performance Kit Piece";
        target.description = desc || target.description || "Engineered stretch fabric cut for high-heat, high-speed night runs.";
        target.image = currentUploadImage;
        target.images = [currentUploadImage];
        target.colors = [{ name: colorName, hex: colorHexVal, swatch: colorHexVal }];
        target.sizes = checkedSizes.length > 0 ? checkedSizes : ["S", "M", "L"];
        target.fabric = fabric || target.fabric || "4-way technical stretch woven shell";
        target.fit = fit || target.fit || "Athletic tailored cut. True to size.";
        target.details = [
          target.fabric,
          target.fit,
          "Moisture-wicking yarn with quick-dry finish",
          "Signature gold reflective accents"
        ];
        target.specs = {
          fabric: target.fabric,
          fit: target.fit,
          origin: target.specs?.origin || "Crafted in Nigeria",
          care: target.specs?.care || "Machine wash cold 30°C. Do not tumble dry."
        };
        target.isCustom = true;
        target.updatedAt = new Date().toISOString();

        saveCustomProducts();
        closeProductModal();
        renderInventory();
        renderTopSellers();

        alert(`"${name}" updated successfully!`);
      } else {
        // ── CREATE MODE ──
        const slug = `${slugify(name)}-${Date.now().toString().slice(-4)}`;

        const newPiece = {
          id: `custom-${Date.now()}`,
          slug,
          name,
          category: category || "Tops",
          price,
          tagline: tagline || "Engineered Performance Kit Piece",
          description: desc || "Engineered stretch fabric cut for high-heat, high-speed night runs.",
          image: currentUploadImage,
          images: [currentUploadImage],
          colors: [{ name: colorName, hex: colorHexVal, swatch: colorHexVal }],
          sizes: checkedSizes.length > 0 ? checkedSizes : ["S", "M", "L"],
          details: [
            fabric || "4-way technical stretch woven shell",
            fit || "Athletic tailored cut. True to size.",
            "Moisture-wicking yarn with quick-dry finish",
            "Signature gold reflective accents"
          ],
          specs: {
            fabric: fabric || "Technical stretch nylon/elastane",
            fit: fit || "Athletic tailored fit",
            origin: "Crafted in Nigeria",
            care: "Machine wash cold 30°C. Do not tumble dry."
          },
          isCustom: true,
          createdAt: new Date().toISOString()
        };

        customProducts.unshift(newPiece);
        saveCustomProducts();

        closeProductModal();
        renderInventory();
        renderTopSellers();

        alert(`"${name}" has been published to the storefront catalogue!`);
      }
    });
  }

  // Modal close buttons
  $("openUploadBtn")?.addEventListener("click", openProductModal);
  $("closeProductBtn")?.addEventListener("click", closeProductModal);
  $("closeProductBackdrop")?.addEventListener("click", closeProductModal);
  $("cancelProductBtn")?.addEventListener("click", closeProductModal);

  // Packing slip close buttons & print
  $("closeDetailBtn")?.addEventListener("click", closeOrderDetail);
  $("closeDetailBackdrop")?.addEventListener("click", closeOrderDetail);
  $("printSlipBtn")?.addEventListener("click", () => window.print());

  // Piece preview close buttons
  $("closeViewPieceBtn")?.addEventListener("click", closePiecePreview);
  $("closeViewPieceBackdrop")?.addEventListener("click", closePiecePreview);

  // Keyboard escape
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductModal();
      closeOrderDetail();
      closePiecePreview();
    }
  });
}

// 11. Announcement Banner Controller
function setupAnnouncementControl() {
  const form = $("announceForm");
  const input = $("announceInput");
  const status = $("announceStatus");
  const clearBtn = $("clearAnnounceBtn");

  if (!form || !input) return;

  const saved = localStorage.getItem("runaway_announcement");
  if (saved) {
    input.value = saved;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) {
      localStorage.setItem("runaway_announcement", val);
      if (status) {
        status.textContent = "✓ Storefront marquee banner updated successfully.";
        setTimeout(() => { if (status) status.textContent = ""; }, 3000);
      }
    }
  });

  clearBtn?.addEventListener("click", () => {
    localStorage.removeItem("runaway_announcement");
    input.value = "";
    if (status) {
      status.textContent = "✓ Reset to default storefront announcement.";
      setTimeout(() => { if (status) status.textContent = ""; }, 3000);
    }
  });
}

// 12. Seed Demo Orders Helper
function seedDemoOrders() {
  const sampleOrders = [
    {
      id: "RW-1048",
      date: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
      customer: { name: "Marcus Vance", email: "marcus.v@nightmiles.cc" },
      items: [
        { name: "Aether Compression Tee", qty: 1, size: "L", colorName: "Eclipse", price: 148000 },
        { name: "Apex Training Shorts", qty: 1, size: "M", colorName: "Void", price: 98000 }
      ],
      total: 246000,
      status: "Pending"
    },
    {
      id: "RW-1047",
      date: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      customer: { name: "Elena Rostova", email: "elena@stridepace.io" },
      items: [
        { name: "Velocity Skull Cap", qty: 2, size: "S/M", colorName: "Black / Gold", price: 42000 }
      ],
      total: 84000,
      status: "Fulfilled"
    },
    {
      id: "RW-1046",
      date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      customer: { name: "Devon Reed", email: "devon.reed@apexclub.org" },
      items: [
        { name: "Aether Compression Tee", qty: 1, size: "XL", colorName: "Eclipse", price: 148000 }
      ],
      total: 148000,
      status: "Fulfilled"
    },
    {
      id: "RW-1045",
      date: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
      customer: { name: "Sophia Zhang", email: "sophia.zh@tempo.com" },
      items: [
        { name: "Apex Training Shorts", qty: 2, size: "S", colorName: "Void", price: 98000 },
        { name: "Velocity Skull Cap", qty: 1, size: "S/M", colorName: "All Black", price: 42000 }
      ],
      total: 238000,
      status: "Pending"
    }
  ];

  orders = [...sampleOrders, ...orders];
  saveOrders();
  refresh();
  renderTopSellers();
}

function clearAllOrders() {
  if (confirm("Are you sure you want to clear all orders? This cannot be undone.")) {
    orders = [];
    saveOrders();
    refresh();
    renderTopSellers();
  }
}

// 13. Event Delegation & Listeners
function setupEvents() {
  // Instant tactile feedback on pointer-down
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn, button, .tab-btn");
    if (btn) {
      btn.classList.add("is-pressed");
      const clean = () => {
        btn.classList.remove("is-pressed");
        window.removeEventListener("pointerup", clean);
        window.removeEventListener("pointercancel", clean);
      };
      window.addEventListener("pointerup", clean, { once: true });
      window.addEventListener("pointercancel", clean, { once: true });
    }
  }, { passive: true });

  // Filter tabs
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderOrders();
    });
  });

  // Search input live filtering
  $("orderSearch")?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderOrders();
  });

  // Export CSV
  $("exportCsvBtn")?.addEventListener("click", exportOrdersToCSV);

  // Table action clicks (Toggle status / Delete / View Slip)
  $("ordersTableBody")?.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest('[data-action="toggle"]');
    const deleteBtn = e.target.closest('[data-action="delete"]');
    const slipBtn = e.target.closest('[data-action="view-slip"]');

    if (slipBtn) {
      const id = slipBtn.dataset.id;
      openOrderDetail(id);
      return;
    }

    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      const targetStatus = toggleBtn.dataset.target;
      const order = orders.find((o) => o.id === id);
      if (order) {
        order.status = targetStatus;
        saveOrders();
        refresh();
        renderTopSellers();
      }
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (confirm(`Remove order ${id}?`)) {
        orders = orders.filter((o) => o.id !== id);
        saveOrders();
        refresh();
        renderTopSellers();
      }
      return;
    }
  });

  // Inventory grid actions (Preview Piece, Edit Piece, & Delete Piece)
  $("inventoryGrid")?.addEventListener("click", (e) => {
    const previewBtn = e.target.closest('[data-action="preview-piece"]');
    if (previewBtn) {
      const slug = previewBtn.dataset.slug;
      openPiecePreview(slug);
      return;
    }

    const editBtn = e.target.closest('[data-action="edit-piece"]');
    if (editBtn) {
      const slug = editBtn.dataset.slug;
      openEditProduct(slug);
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-piece"], [data-action="delete-custom"]');
    if (deleteBtn) {
      const slug = deleteBtn.dataset.slug;
      deleteProduct(slug);
      return;
    }
  });

  // Action buttons
  $("restoreCoreBtn")?.addEventListener("click", restoreCoreCatalogue);
  $("seedBtn")?.addEventListener("click", seedDemoOrders);
  $("clearBtn")?.addEventListener("click", clearAllOrders);

  // Logout button
  $("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("runaway_owner_session");
    sessionStorage.removeItem("runaway_owner_login_time");
    window.location.replace("login.html");
  });
}

function refresh() {
  renderMetrics();
  renderOrders();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadCustomProducts();
  loadDeletedSlugs();
  loadOrders();
  setupEvents();
  setupProductUpload();
  setupAnnouncementControl();
  renderMetrics();
  renderOrders();
  renderInventory();
  renderTopSellers();
});

