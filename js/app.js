/* RUNAWAY redesign — vanilla JS: catalogue, filters, quickview, cart, motion */
"use strict";

const IMG = "./public/images/";

// Relies on PRODUCTS, money, getAllProducts from js/data.js

/* ── loader ── */
window.addEventListener("load", () =>
  setTimeout(() => document.getElementById("loader").classList.add("done"), 500)
);
setTimeout(() => document.getElementById("loader").classList.add("done"), 2600); // fallback

/* ── header / menu ── */
const header = document.getElementById("siteHeader");
addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 24), { passive: true });
header.classList.toggle("scrolled", scrollY > 24);

const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");
menuBtn.addEventListener("click", () => {
  const open = mobileNav.classList.toggle("open");
  menuBtn.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
});
document.querySelectorAll("[data-scroll]").forEach((a) =>
  a.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    menuBtn.classList.remove("open");
    document.body.style.overflow = "";
  })
);

/* ── cursor aura + hero/craft parallax ── */
const aura = document.getElementById("aura");
let ax = -500, ay = -500, tx = ax, ty = ay;
addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
(function auraLoop() {
  ax += (tx - ax) * 0.08; ay += (ty - ay) * 0.08;
  aura.style.left = ax + "px"; aura.style.top = ay + "px";
  requestAnimationFrame(auraLoop);
})();

const heroBg = document.querySelector("#heroBg img");
const craftBg = document.getElementById("craftBg");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  addEventListener("scroll", () => {
    const y = scrollY;
    if (y < innerHeight * 1.2) heroBg.style.transform = `translateY(${y * 0.22}px) scale(1.05)`;
    const c = document.getElementById("craft").getBoundingClientRect();
    if (c.top < innerHeight && c.bottom > 0)
      craftBg.style.transform = `translateY(${c.top * -0.08}px)`;
  }, { passive: true });
}

/* ── marquee: dynamic announcement banner + seamless loop ── */
const track = document.getElementById("marqueeTrack");
if (track) {
  try {
    const customAnnounce = localStorage.getItem("runaway_announcement");
    if (customAnnounce && customAnnounce.trim()) {
      track.innerHTML = `<span>${customAnnounce.trim()}</span><b>//</b><span>RUNAWAY ATHLETICISM</span><b>//</b><span>COLLECTION 01</span><b>//</b>`;
    }
  } catch (_) {}
  track.innerHTML += track.innerHTML + track.innerHTML;
}

/* ── tilt cards ── */
if (matchMedia("(hover:hover)").matches && !reduceMotion) {
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

/* ── reveal on scroll + counters ── */
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    en.target.querySelectorAll("[data-count]").forEach(runCounter);
    if (en.target.hasAttribute("data-count")) runCounter(en.target);
    io.unobserve(en.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

function runCounter(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const end = +el.dataset.count, t0 = performance.now(), dur = 1200;
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(end * e);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ── product grid + filters (supports custom uploaded pieces) ── */
const grid = document.getElementById("productGrid");
let activeFilter = "All";


function resolveProductImage(p, idx = 0) {
  if (p.images && p.images[idx]) {
    const src = p.images[idx];
    return (src.startsWith("data:") || src.startsWith("http")) ? src : IMG + src;
  }
  if (p.image) {
    return (p.image.startsWith("data:") || p.image.startsWith("http")) ? p.image : IMG + p.image;
  }
  return IMG + "logo-runners.png";
}

function cardHTML(p) {
  const mainImg = resolveProductImage(p, 0);
  const fileLink = p.file || ("products/product.html?slug=" + encodeURIComponent(p.slug));
  return `
  <article class="card" data-slug="${p.slug}">
    <div class="card-media">
      <a href="${fileLink}" style="display:block;width:100%;height:100%;">
        <img src="${mainImg}" alt="${p.name}" loading="lazy" />
      </a>
      <span class="card-badge">${p.category}</span>
      <button class="card-quick" data-quickview="${p.slug}">Quick view +</button>
    </div>
    <div class="card-row">
      <div><p class="card-cat">${p.tagline || ""}</p><h3 class="card-name"><a href="${fileLink}" style="color:inherit">${p.name}</a></h3></div>
      <p class="card-price">${money(p.price)}</p>
    </div>
  </article>`;
}

function renderGrid() {
  const all = getAllProducts();
  const list = activeFilter === "All" ? all : all.filter((p) => p.category === activeFilter);
  grid.innerHTML = list.map(cardHTML).join("");
  // entrance stagger
  [...grid.children].forEach((c, i) => {
    c.style.opacity = "0"; c.style.transform = "translateY(18px)";
    setTimeout(() => { c.style.opacity = ""; c.style.transform = ""; }, 60 * i + 30);
  });
}
renderGrid();

document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    if (chip.dataset.filter === activeFilter) return;
    document.querySelector(".chip.is-active")?.classList.remove("is-active");
    chip.classList.add("is-active");
    // animate out, then swap
    [...grid.children].forEach((c) => c.classList.add("leaving"));
    setTimeout(() => { activeFilter = chip.dataset.filter; renderGrid(); }, 220);
  })
);

/* ── quickview modal (Apple fluid spatial expansion) ── */
const modal = document.getElementById("qvModal");
let qv = null, qvColor = null, qvSize = null, qvImgIdx = 0;

function openQuickview(slug, triggerEl) {
  qv = getAllProducts().find((x) => x.slug === slug);
  if (!qv) return;

  if (triggerEl) {
    const card = triggerEl.closest(".card") || triggerEl;
    const rect = card.getBoundingClientRect();
    const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    const modalCard = modal.querySelector(".modal-card");
    if (modalCard) {
      modalCard.style.setProperty("--origin-x", `${originX.toFixed(1)}%`);
      modalCard.style.setProperty("--origin-y", `${originY.toFixed(1)}%`);
    }
  }

  qvColor = (qv.colors && qv.colors[0]) || { id: "default", name: "Standard", swatch: "#111" };
  qvSize = (qv.sizes && qv.sizes.length === 1) ? qv.sizes[0] : null;
  qvImgIdx = 0;

  document.getElementById("qvCat").textContent = qv.category || "Kit";
  document.getElementById("qvName").textContent = qv.name;
  document.getElementById("qvTag").textContent = qv.tagline || "";
  document.getElementById("qvPrice").textContent = money(qv.price);
  document.getElementById("qvDesc").textContent = qv.description || "";
  document.getElementById("qvMeta").textContent = `Fabric — ${qv.fabric || qv.specs?.fabric || "Performance knit"} · Fit — ${qv.fit || qv.specs?.fit || "Athletic"}`;
  document.getElementById("qvHint").textContent = "";

  const qvFull = document.getElementById("qvFull");
  const fullLink = qv.file || ("products/product.html?slug=" + encodeURIComponent(qv.slug));
  if (qvFull) {
    qvFull.href = fullLink;
    qvFull.style.display = "";
  }

  paintQV();
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.body.classList.add("staged");
}
function paintQV() {
  const img = document.getElementById("qvImg");
  const mainImg = resolveProductImage(qv, qvImgIdx);
  img.src = mainImg;
  img.alt = qv.name;
  const images = Array.isArray(qv.images) && qv.images.length ? qv.images : [qv.image || "logo-runners.png"];
  document.getElementById("qvThumbs").innerHTML = images.map((s, i) =>
    `<button class="${i === qvImgIdx ? "active" : ""}" data-thumb="${i}" aria-label="View image ${i + 1}"><img src="${resolveProductImage(qv, i)}" alt="" loading="lazy" /></button>`
  ).join("");
  document.getElementById("qvColorName").textContent = qvColor.name;
  document.getElementById("qvColors").innerHTML = (qv.colors || []).map((c) =>
    `<button class="${(c.id || c.name) === (qvColor.id || qvColor.name) ? "active" : ""}" data-color="${c.id || c.name}" aria-label="${c.name}" title="${c.name}"><i style="background:${c.swatch || c.hex || "#0c0c0c"}"></i></button>`
  ).join("");
  document.getElementById("qvSizes").innerHTML = (qv.sizes || ["S", "M", "L"]).map((s) =>
    `<button class="${s === qvSize ? "active" : ""}" data-size="${s}">${s}</button>`
  ).join("");
}
function closeQuickview() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (!document.querySelector(".drawer-root.open")) {
    document.body.classList.remove("staged");
  }
}

document.addEventListener("click", (e) => {
  const qvBtn = e.target.closest("[data-quickview]");
  if (qvBtn) { openQuickview(qvBtn.dataset.quickview, qvBtn); return; }
  if (e.target.closest("[data-close-qv]")) { closeQuickview(); return; }
  const th = e.target.closest("[data-thumb]");
  if (th && qv) { qvImgIdx = +th.dataset.thumb; paintQV(); return; }
  const sw = e.target.closest("[data-color]");
  if (sw && qv) { qvColor = qv.colors.find((c) => c.id === sw.dataset.color); paintQV(); return; }
  const sz = e.target.closest("[data-size]");
  if (sz && qv) { qvSize = sz.dataset.size; document.getElementById("qvHint").textContent = ""; paintQV(); return; }
});
addEventListener("keydown", (e) => { if (e.key === "Escape") { closeQuickview(); closeDrawer(); } });

document.getElementById("qvAdd")?.addEventListener("click", () => {
  if (!qvSize) { document.getElementById("qvHint").textContent = "Choose a size."; return; }
  const mainImg = resolveProductImage(qv, 0);
  Cart.add({
    slug: qv.slug,
    name: qv.name,
    price: qv.price,
    size: qvSize,
    color: qvColor.id || qvColor.name,
    colorName: qvColor.name,
    image: mainImg
  });
  closeQuickview();
  paintBag();
  openDrawer();
  toast(`${qv.name} — added to bag`);
});


