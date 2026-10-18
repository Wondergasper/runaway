/* RUNAWAY redesign — shared catalogue data (used by every page) */
"use strict";

const isSubdir = typeof window !== "undefined" && (
  window.location.pathname.includes("/products/") || 
  window.location.pathname.includes("\\products\\") ||
  window.location.pathname.includes("/admin/") || 
  window.location.pathname.includes("\\admin\\")
);

const BASE = isSubdir ? "../" : "./";
const IMG = BASE + "public/images/";

const PRODUCTS = [
  {
    slug: "aether-compression-tee",
    file: BASE + "products/aether-compression-tee.html",
    name: "Aether Compression Tee",
    category: "Tops",
    price: 148000,
    tagline: "Second-skin performance",
    description:
      "A raglan compression tee cut for heat, speed, and the hours after. Gold piping traces the shoulders. A gold-to-violet gradient panel runs the side seam. RUNAWAY is set vertically down the spine.",
    story: "Built as the house kit — the piece you train in, travel in, and refuse to take off. Engineered stretch holds shape through the session. Flatlock seams disappear against skin. A woven hem label is the only signature you need.",
    images: ["tee-front.jpg", "tee-back.jpg", "lifestyle-tee.jpg", "tee-detail-logo.jpg", "tee-detail-seam.jpg", "tee-detail-sleeve.jpg", "tee-detail-hem.jpg"],
    colors: [{ id: "eclipse", name: "Eclipse", swatch: "#0c0c0c" }],
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: [
      { label: "Compression knit", detail: "Holds without binding" },
      { label: "Raglan mobility", detail: "Unbroken shoulder line" },
      { label: "Gold piping", detail: "Traced seams, not printed" },
      { label: "Spine mark", detail: "Vertical RUNAWAY lockup" },
    ],
    fabric: "Premium stretch jersey with moisture-wicking finish. Mesh-vented gradient side panel.",
    fit: "Compression. Size up for a training-regular feel.",
  },
  {
    slug: "apex-training-shorts",
    file: BASE + "products/apex-training-shorts.html",
    name: "Apex Training Shorts",
    category: "Bottoms",
    price: 98000,
    tagline: "Cut to move",
    description:
      "Lightweight training shorts with a gold-tipped drawcord, side vents, and the dual-runner mark at the thigh. Quiet luxury for the work that happens before sunrise.",
    story: "A clean short with no extra noise — just stretch, breathability, and a slit that opens when you stride. The gold tips on the cord are the only flash. Everything else is matte black.",
    images: ["shorts-front.jpg", "shorts-back.jpg", "lifestyle-shorts.jpg", "shorts-detail-logo.jpg", "shorts-detail-vent.jpg", "shorts-detail-draw.jpg", "shorts-detail-stitch.jpg"],
    colors: [{ id: "void", name: "Void", swatch: "#0a0a0a" }],
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: [
      { label: "Lightweight", detail: "Feather feel in motion" },
      { label: "Breathable", detail: "Open knit, fast dry" },
      { label: "4-way stretch", detail: "Stride without bind" },
      { label: "Moisture wicking", detail: "Pulls heat off skin" },
    ],
    fabric: "Four-way stretch woven with a dry-hand finish. Elastic waist, internal drawcord.",
    fit: "Athletic. Sits at the hip, splits at the stride.",
  },
  {
    slug: "velocity-skull-cap",
    file: BASE + "products/velocity-skull-cap.html",
    name: "Velocity Skull Cap",
    category: "Accessories",
    price: 42000,
    tagline: "Stay locked in",
    description:
      "A performance skull cap with ventilated panels, a silicone grip band, and an embossed gold runner. Four colorways — from all black to midnight.",
    story: "Designed to disappear under a hood or sit alone in the cold start. Moisture-wicking, four-way stretch, feather-light. The grip band keeps it honest when the pace goes up.",
    images: ["lifestyle-cap.jpg", "cap-sheet.jpg", "cap-colorways.jpg", "cap-hero.jpg"],
    colors: [
      { id: "all-black", name: "All Black", swatch: "#111111" },
      { id: "black-gold", name: "Black / Gold", swatch: "#c9a84c" },
      { id: "black-silver", name: "Black / Silver", swatch: "#c5c5c8" },
      { id: "midnight", name: "Midnight", swatch: "#1b2433" },
    ],
    sizes: ["S/M", "L/XL"],
    features: [
      { label: "Ventilated", detail: "Breathable panels" },
      { label: "Grip band", detail: "Silicone stay-put" },
      { label: "Flatlock seams", detail: "No hot spots" },
      { label: "Embossed mark", detail: "Gold runner, low profile" },
    ],
    fabric: "Premium stretch knit. Moisture-wicking. Feather-light.",
    fit: "Secure. Choose S/M or L/XL.",
  },
];

const money = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) && amount > 0 ? amount : 0);

function getCustomProducts() {
  const storage = typeof window !== "undefined" ? window.localStorage : (typeof localStorage !== "undefined" ? localStorage : null);
  if (!storage) return [];
  try {
    const raw = JSON.parse(storage.getItem("runaway_custom_products") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function getDeletedSlugs() {
  const storage = typeof window !== "undefined" ? window.localStorage : (typeof localStorage !== "undefined" ? localStorage : null);
  if (!storage) return [];
  try {
    const raw = JSON.parse(storage.getItem("runaway_deleted_slugs") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function getAllProducts() {
  const deleted = new Set(getDeletedSlugs());
  const custom = getCustomProducts();
  const customMap = new Map(custom.map((p) => [p.slug, p]));
  const res = [];
  
  for (const p of PRODUCTS) {
    if (deleted.has(p.slug)) continue;
    if (customMap.has(p.slug)) {
      res.push(customMap.get(p.slug));
      customMap.delete(p.slug);
    } else {
      res.push(p);
    }
  }

  for (const p of customMap.values()) {
    if (!deleted.has(p.slug)) {
      res.push(p);
    }
  }

  return res;
}

const getProduct = (slug) => getAllProducts().find((p) => p.slug === slug);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PRODUCTS, money, getCustomProducts, getDeletedSlugs, getAllProducts, getProduct };
}
